import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/supabase";
import { makeReturnUrl, STRIPE_RETURN_PATHS } from "@/utils/constants";

// Types for the subscription system
export type SubscriptionStatus = "active" | "canceled" | "trialing" | "past_due" | "unpaid" | null;

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  displayStatus: "active" | "canceling" | "inactive"; // UI display status
  planName: string;
  currentPeriodEnd: string | null;
  customerPortalUrl: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

export interface UsageData {
  imageGenerations: number;
  dreamAnalyses: number;
}

// Database types
type UsageLog = Database['public']['Tables']['usage_logs']['Row'];

interface Dream {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
}

interface DreamAnalysis {
  id: string;
  user_id: string;
  created_at: string;
}

// Local storage key for subscription status
const SUBSCRIPTION_STATUS_KEY = "subscription_status";

// Cache key for subscription data
const SUBSCRIPTION_CACHE_KEY = "subscription_cache";
// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [remainingUsage, setRemainingUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  // Add tracking for last notification time to prevent duplicates
  const lastNotificationRef = useRef<number>(0);
  const lastStatusLogRef = useRef<string>("");
  
  // Get previous status from localStorage, not from state to persist across page reloads
  const getPreviousStatus = (): SubscriptionStatus => {
    if (!user) return null;
    try {
      const storedStatus = localStorage.getItem(`${SUBSCRIPTION_STATUS_KEY}_${user.id}`);
      return storedStatus as SubscriptionStatus;
    } catch (e) {
      return null;
    }
  };
  
  // Save status to localStorage
  const saveStatusToStorage = (status: SubscriptionStatus) => {
    if (!user) return;
    try {
      localStorage.setItem(`${SUBSCRIPTION_STATUS_KEY}_${user.id}`, status || "null");
    } catch (e) {
      console.error("Failed to save subscription status to localStorage:", e);
    }
  };

  // Add helper function for logging status to avoid duplication
  const logStatusOnce = (status: string, forceLog = false) => {
    // Only log if status changed or if it's been more than 30 seconds since the last log of this status
    const now = Date.now();
    const timeSinceLastLog = typeof lastNotificationRef.current === 'number' ? now - lastNotificationRef.current : Infinity;
    
    if (forceLog || 
        status !== lastStatusLogRef.current || 
        timeSinceLastLog > 30000) {
      console.log("Subscription status checked with Stripe: ", status);
      lastStatusLogRef.current = status;
      // Store the timestamp to throttle future logs of the same status
      lastNotificationRef.current = now;
    }
  };

  // Add helper function for showing toast notifications
  const showActivationToast = (prevStatus: SubscriptionStatus) => {
    // Only show notification when status changes from non-active to active
    // AND not if we've shown it in the last 5 seconds
    const now = Date.now();
    if ((prevStatus !== "active" && prevStatus !== "canceling" as any) && 
        now - lastNotificationRef.current > 5000) {
      toast({
        title: "Premium Active",
        description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
      });
      lastNotificationRef.current = now;
    }
  };

  // Create helper functions for caching subscription data
  const getSubscriptionFromCache = () => {
    try {
      const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error("Error reading subscription cache:", error);
      return null;
    }
  };

  const saveSubscriptionToCache = (data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error saving subscription to cache:", error);
    }
  };

  // Fetch subscription data
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        
        // Get previous status from localStorage
        const previousStatus = getPreviousStatus();
        
        // Directly query the customer_subscriptions table to get the current status
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, status, customer_portal_url, stripe_customer_id, cancel_at_period_end, current_period_end, canceled_at")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (subscriptionError) {
          console.error("Error fetching subscription data:", subscriptionError);
          // Don't show a toast to users about database errors - just fall back to free tier
          await safelyFetchUsageData();
        } else if (subscriptionData && subscriptionData.status === "active") {
          // Check if subscription_id is NULL but status is active - attempt to fix
          if (!subscriptionData.subscription_id && subscriptionData.stripe_customer_id) {
            console.log("Found active subscription with NULL subscription_id, attempting to fix...");
            
            try {
              // Get current session
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              
              if (accessToken) {
                // Call the get-stripe-subscription endpoint to get the subscription_id
                const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'x-client-info': 'slumber-synthesizer/1.0.0'
                  },
                  body: JSON.stringify({
                    userId: user.id,
                    stripeCustomerId: subscriptionData.stripe_customer_id
                  })
                });
                
                if (fetchResponse.ok) {
                  const stripeData = await fetchResponse.json();
                  if (stripeData.subscription_id) {
                    console.log("Retrieved subscription data from Stripe");
                    
                    // Update the subscription_id in the database
                    const { error: updateError } = await supabase
                      .from("customer_subscriptions")
                      .update({
                        subscription_id: stripeData.subscription_id,
                        updated_at: new Date().toISOString()
                      })
                      .eq("user_id", user.id);
                      
                    if (updateError) {
                      console.error("Error updating NULL subscription_id:", updateError);
                    } else {
                      console.log("Successfully updated NULL subscription_id in database");
                      // Update local data with the corrected subscription_id
                      subscriptionData.subscription_id = stripeData.subscription_id;
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error fixing NULL subscription_id:", err);
            }
          }
          
          // For active & canceling subscriptions, check with Stripe for full details
          try {
            if (subscriptionData.subscription_id) {
              // Get current session
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              
              if (accessToken) {
                // Call the get-stripe-subscription endpoint to verify cancellation status
                const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'x-client-info': 'slumber-synthesizer/1.0.0'
                  },
                  body: JSON.stringify({
                    userId: user.id,
                    stripeCustomerId: subscriptionData.stripe_customer_id
                  })
                });
                
                if (fetchResponse.ok) {
                  // Successfully fetched subscription ID, check for cancellation
                  const stripeData = await fetchResponse.json();
                  
                  // Set subscription with proper cancellation status and generate display status
                  let isActive = stripeData.status === "active";
                  let isCanceling = isActive && stripeData.cancel_at_period_end;
                  
                  // Special case: "canceled" status from Stripe but still in paid period
                  // should be treated as "canceling"
                  if (stripeData.status === "canceled" && 
                     stripeData.current_period_end && 
                     new Date(stripeData.current_period_end * 1000) > new Date()) {
                    isActive = true;
                    isCanceling = true;
                    console.log("Detected canceled subscription still in paid period - treating as canceling");
                  }
                  
                  // Determine the display status based on Stripe values
                  let displayStatus: "active" | "canceling" | "inactive" = "inactive";
                  if (isActive) {
                    displayStatus = isCanceling ? "canceling" : "active";
                  }
                  
                  setSubscription({
                    id: subscriptionData.subscription_id || "",
                    status: isActive ? "active" : stripeData.status,
                    displayStatus,
                    planName: "Premium",
                    currentPeriodEnd: stripeData.current_period_end ? new Date(stripeData.current_period_end * 1000).toISOString() : null,
                    customerPortalUrl: subscriptionData.customer_portal_url || null,
                    cancelAtPeriodEnd: isCanceling || stripeData.cancel_at_period_end || false,
                    canceledAt: stripeData.canceled_at ? new Date(stripeData.canceled_at * 1000).toISOString() : null,
                  });
                  
                  // Save status
                  saveStatusToStorage(displayStatus);
                  
                  // ALWAYS set unlimited for active subscribers and canceling subscribers within the paid period
                  setRemainingUsage({
                    imageGenerations: Infinity,
                    dreamAnalyses: Infinity,
                  });
                  
                  const statusToLog = stripeData.status === "active" && stripeData.cancel_at_period_end ? "canceling" : stripeData.status;
                  logStatusOnce(statusToLog);
                  
                  // Only show notification when status changes from non-active/non-canceling to active
                  // AND not on initial load/refresh if already active
                  showActivationToast(previousStatus);
                  
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (err) {
            console.error("Error checking cancellation status:", err);
          }
          
          // Fallback if Stripe check fails: Set subscription to active
          setSubscription({
            id: subscriptionData.subscription_id || "",
            status: "active",
            displayStatus: "active",
            planName: "Premium",
            currentPeriodEnd: null,
            customerPortalUrl: subscriptionData.customer_portal_url || null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          });
          
          // Always set unlimited for active subscribers
          setRemainingUsage({
            imageGenerations: Infinity,
            dreamAnalyses: Infinity,
          });
          
          // Only show notification when status changes from non-active to active
          if (previousStatus !== "active") {
            showActivationToast(previousStatus);
            saveStatusToStorage("active");
          }
        } else if (subscriptionData && subscriptionData.stripe_customer_id && 
                  (subscriptionData.status === null || subscriptionData.status === undefined)) {
          // Special case: Has stripe_customer_id but missing status - fix it in-place
          console.log("Found subscription with stripe_customer_id but null status, updating to active");
          
          // Update the subscription status to active
          const { error: updateError } = await supabase
            .from("customer_subscriptions")
            .update({ 
              status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);
            
          if (updateError) {
            console.error("Error updating subscription status:", updateError);
          } else {
            // Set subscription to active
            setSubscription({
              id: subscriptionData.subscription_id || "",
              status: "active",
              displayStatus: "active",
              planName: "Premium", 
              currentPeriodEnd: null,
              customerPortalUrl: subscriptionData.customer_portal_url || null,
              cancelAtPeriodEnd: false,
              canceledAt: null,
            });
            
            // Set unlimited usage
            setRemainingUsage({
              imageGenerations: Infinity,
              dreamAnalyses: Infinity,
            });
            
            // Show notification if status changed
            if (previousStatus !== "active") {
              showActivationToast(previousStatus);
              saveStatusToStorage("active");
            }
          }
        } else {
          // No active subscription, fall back to the Edge Function for more details
          try {
            // Get current session
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            
            if (!accessToken) {
              throw new Error("No authentication token available");
            }
            
            // Use the local proxy to avoid CORS issues
            const response = await fetch('/api/functions/v1/get-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-client-info': 'slumber-synthesizer/1.0.0'
              },
              body: JSON.stringify({ userId: user.id })
            });
            
            if (!response.ok) {
              // Handle 404 errors specifically - likely due to Edge Function not being available in dev
              if (response.status === 404) {
                console.warn("Subscription API not available. Using free tier fallback in development.");
                setSubscription(null);
                saveStatusToStorage(null);
                await safelyFetchUsageData();
                return;
              }
              throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data?.subscription) {
              setSubscription(data.subscription);
              
              // If active from the API response, set unlimited usage
              if (data.subscription.status === "active") {
                setRemainingUsage({
                  imageGenerations: Infinity,
                  dreamAnalyses: Infinity,
                });
                console.log("Active subscription confirmed from API, unlimited usage enabled");
                
                // Only show notification when status changes from non-active to active
                if (previousStatus !== "active") {
                  showActivationToast(previousStatus);
                }
                saveStatusToStorage("active");
              } else {
                // Not active, use the free tier limits
                saveStatusToStorage(data.subscription.status);
                await safelyFetchUsageData();
              }
            } else {
              setSubscription(null);
              saveStatusToStorage(null);
              await safelyFetchUsageData();
            }
          } catch (error) {
            console.error('Error fetching subscription from API:', error);
            // Don't show the error toast in development mode
            if (!import.meta.env.DEV) {
              toast({
                variant: "destructive",
                title: "Subscription Check Failed",
                description: "Using free tier limits for now. Please try again later.",
              });
            }
            setSubscription(null);
            saveStatusToStorage(null);
            await safelyFetchUsageData();
          }
        }
      } catch (error) {
        console.error('Error in subscription hook:', error);
        await safelyFetchUsageData();
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user, toast]);

  // Add listener for when user returns from Stripe portal
  useEffect(() => {
    // Define the subscription fetch function
    const refreshFromStripe = async () => {
      try {
        setIsLoading(true);
        
        // Get previous status from localStorage
        const previousStatus = getPreviousStatus();
        
        // Directly query the customer_subscriptions table to get the current status
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, status, customer_portal_url, stripe_customer_id, cancel_at_period_end, current_period_end, canceled_at")
          .eq("user_id", user.id)
          .maybeSingle();
          
        // Rest of the logic similar to fetchSubscription
        if (subscriptionError) {
          console.error("Error fetching subscription data:", subscriptionError);
          await safelyFetchUsageData();
        } else if (subscriptionData && subscriptionData.status === "active") {
          // For active & canceling subscriptions, check with Stripe for full details
          try {
            if (subscriptionData.subscription_id) {
              // Get current session
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              
              if (accessToken) {
                // Call the get-stripe-subscription endpoint to verify cancellation status
                const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'x-client-info': 'slumber-synthesizer/1.0.0'
                  },
                  body: JSON.stringify({
                    userId: user.id,
                    stripeCustomerId: subscriptionData.stripe_customer_id
                  })
                });
                
                if (fetchResponse.ok) {
                  // Successfully fetched subscription ID, check for cancellation
                  const stripeData = await fetchResponse.json();
                  
                  // Set subscription with proper cancellation status and generate display status
                  let isActive = stripeData.status === "active";
                  let isCanceling = isActive && stripeData.cancel_at_period_end;
                  
                  // Special case: "canceled" status from Stripe but still in paid period
                  // should be treated as "canceling"
                  if (stripeData.status === "canceled" && 
                     stripeData.current_period_end && 
                     new Date(stripeData.current_period_end * 1000) > new Date()) {
                    isActive = true;
                    isCanceling = true;
                    console.log("Detected canceled subscription still in paid period - treating as canceling");
                  }
                  
                  // Determine the display status based on Stripe values
                  let displayStatus: "active" | "canceling" | "inactive" = "inactive";
                  if (isActive) {
                    displayStatus = isCanceling ? "canceling" : "active";
                  }
                  
                  setSubscription({
                    id: subscriptionData.subscription_id || "",
                    status: isActive ? "active" : stripeData.status,
                    displayStatus,
                    planName: "Premium",
                    currentPeriodEnd: stripeData.current_period_end ? new Date(stripeData.current_period_end * 1000).toISOString() : null,
                    customerPortalUrl: subscriptionData.customer_portal_url || null,
                    cancelAtPeriodEnd: isCanceling || stripeData.cancel_at_period_end || false,
                    canceledAt: stripeData.canceled_at ? new Date(stripeData.canceled_at * 1000).toISOString() : null,
                  });
                  
                  // Save status
                  saveStatusToStorage(displayStatus);
                  
                  // ALWAYS set unlimited for active subscribers and canceling subscribers within the paid period
                  setRemainingUsage({
                    imageGenerations: Infinity,
                    dreamAnalyses: Infinity,
                  });
                  
                  const statusToLog = stripeData.status === "active" && stripeData.cancel_at_period_end ? "canceling" : stripeData.status;
                  logStatusOnce(statusToLog);
                }
              }
            }
          } catch (err) {
            console.error("Error checking cancellation status after Stripe portal:", err);
          }
        }
      } catch (error) {
        console.error("Error refreshing subscription after Stripe portal:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Function to check if user just returned from Stripe portal
    const checkReturnFromStripe = () => {
      // Check if URL includes tab=subscription which is our return URL from Stripe
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const fromStripe = searchParams.get('fromStripe');
      
      // Only refresh if we have both tab=subscription AND fromStripe=true
      // This prevents refreshing when user is just navigating tabs within the app
      if (tabParam === 'subscription' && fromStripe === 'true' && user) {
        console.log("Detected return from Stripe portal, refreshing subscription data");
        // Wait a moment to ensure page is fully loaded
        setTimeout(() => {
          refreshFromStripe().catch(err => {
            console.error("Error refreshing subscription after returning from Stripe:", err);
          });
          
          // Clean up the URL to remove the fromStripe parameter
          if (window.history && window.history.replaceState) {
            const newUrl = `${window.location.pathname}?tab=subscription`;
            window.history.replaceState({}, '', newUrl);
          }
        }, 500);
      }
    };
    
    // Check on mount - but only if URL has tab=subscription parameter
    checkReturnFromStripe();
    
    // Return cleanup function - nothing to clean up
    return () => {};
  }, [user]);

  // Safely fetch usage data, with fallbacks for any errors
  const safelyFetchUsageData = async () => {
    setIsUsageLoading(true);
    try {
      await fetchUsageData();
    } catch (error) {
      console.error("Error in safelyFetchUsageData:", error);
      // Use default free tier values in case of ANY error
      setRemainingUsage({
        imageGenerations: 5,
        dreamAnalyses: 7,
      });
    } finally {
      setIsUsageLoading(false);
    }
  };

  // Fetch usage data from the database - only needed for free tier
  const fetchUsageData = async () => {
    if (!user) {
      setRemainingUsage({
        imageGenerations: 0,
        dreamAnalyses: 0
      });
      setIsUsageLoading(false);
      return;
    }
    
    // If user has an active subscription, they have unlimited usage
    if (subscription?.status === "active") {
      setRemainingUsage({
        imageGenerations: Infinity,
        dreamAnalyses: Infinity
      });
      setIsUsageLoading(false);
      return;
    }

    try {
      // Get the current week's start date (Sunday)
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
      startOfWeek.setUTCHours(0, 0, 0, 0);
      const startDateStr = startOfWeek.toISOString();

      // Set free tier limits
      const freeImageLimit = 5;
      const freeAnalysisLimit = 7;
      
      // Fallback values - assume maximum usage in case of any errors
      let imageCount = 0;
      let analysisCount = 0;
      
      try {
        // Count image generations from usage_logs
        const { data: imageData, error: imageError } = await supabase
          .from("usage_logs")
          .select("count")
          .eq("user_id", user.id)
          .eq("type", "image")
          .gte("created_at", startDateStr);
        
        if (!imageError && imageData) {
          // Sum up all counts
          imageCount = imageData.reduce((sum, record) => sum + record.count, 0);
        }
        
        // Count analyses from usage_logs
        const { data: analysisData, error: analysisError } = await supabase
          .from("usage_logs")
          .select("count")
          .eq("user_id", user.id)
          .eq("type", "analysis")
          .gte("created_at", startDateStr);
        
        if (!analysisError && analysisData) {
          // Sum up all counts
          analysisCount = analysisData.reduce((sum, record) => sum + record.count, 0);
        }
      } catch (error) {
        console.error("Error counting from usage_logs:", error);
      }

      // Update the remaining usage for free tier
      setRemainingUsage({
        imageGenerations: Math.max(0, freeImageLimit - imageCount),
        dreamAnalyses: Math.max(0, freeAnalysisLimit - analysisCount),
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
      // Use default free tier values in case of error
      setRemainingUsage({
        imageGenerations: 5,
        dreamAnalyses: 7,
      });
    } finally {
      setIsUsageLoading(false);
    }
  };

  // Check if user has reached their usage limit for a specific feature
  const hasReachedLimit = (type: 'image' | 'analysis') => {
    if (!user) return true;
    
    // Always unlimited access for active subscriptions
    if (subscription?.status === "active") return false;
    
    // Check if cancelling but still within subscription period
    if (subscription?.status === "canceling" && subscription?.currentPeriodEnd) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      if (now < endDate) {
        return false; // Still have unlimited access until end date
      }
    }
    
    // If both remainingUsage is null AND isUsageLoading is true, 
    // we haven't loaded the first time - assume limit is reached for safety
    if (remainingUsage === null && isUsageLoading) return true;
    
    // If we've loaded at least once, use the latest known value
    if (type === 'image') {
      return (remainingUsage?.imageGenerations ?? 0) <= 0;
    } else {
      return (remainingUsage?.dreamAnalyses ?? 0) <= 0;
    }
  };

  // Record feature usage in the database and decrement local counter
  const recordUsage = async (type: 'image' | 'analysis') => {
    if (!user) return;
    
    // No need to record usage for users with active subscriptions
    if (subscription?.status === "active") return;
    
    // No need to record usage for canceling subscriptions still within their paid period
    if (subscription?.status === "canceling" && subscription?.currentPeriodEnd) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      if (now < endDate) {
        return; // Still have unlimited access until end date
      }
    }
    
    try {
      // Insert usage record into usage_logs table
      const { error } = await supabase
        .from("usage_logs")
        .insert({
          user_id: user.id,
          type: type,
          count: 1
        });
      
      if (error) {
        console.error("Error recording usage:", error);
      }
    } catch (err) {
      console.error("Failed to record usage:", err);
    }
    
    // For free tier users, decrement the local counter
    if (type === 'image') {
      setRemainingUsage(prev => ({
        // If previous state was null, use default values
        imageGenerations: Math.max(0, (prev?.imageGenerations ?? 5) - 1),
        dreamAnalyses: prev?.dreamAnalyses ?? 7
      }));
    } else {
      setRemainingUsage(prev => ({
        // If previous state was null, use default values
        imageGenerations: prev?.imageGenerations ?? 5,
        dreamAnalyses: Math.max(0, (prev?.dreamAnalyses ?? 7) - 1)
      }));
    }
  };

  // Function to get the correct return URL for Stripe portal
  const getReturnUrl = () => {
    // Add a fromStripe parameter to identify returns from Stripe portal
    return makeReturnUrl(STRIPE_RETURN_PATHS.SETTINGS) + '&fromStripe=true';
  };

  // Update startCheckout function to use dynamic return URL
  const startCheckout = async (planId: string, returnUrl?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to subscribe.",
      });
      return;
    }

    try {
      toast({
        title: "Creating checkout session...",
        description: "Please wait while we prepare your checkout.",
      });

      // Use supabase.functions.invoke instead of direct fetch
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          userId: user.id, 
          planId,
          returnUrl: returnUrl || makeReturnUrl(STRIPE_RETURN_PATHS.CHECKOUT_COMPLETE)
        }
      });

      if (error) {
        console.error('Error response:', error);
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        variant: "destructive",
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
      });
    }
  };

  // Function to manually refresh subscription status
  const refreshSubscription = async () => {
    // First check if we have a recent cached subscription
    const cachedSubscription = getSubscriptionFromCache();
    if (cachedSubscription) {
      // Compare with current subscription to avoid unnecessary UI updates
      if (JSON.stringify(cachedSubscription) === JSON.stringify(subscription)) {
        console.log("Using cached subscription data - no changes detected");
        return; // No need to update state if data is the same
      }
      
      setSubscription(cachedSubscription);
      
      // Set usage limits based on cached subscription
      if (cachedSubscription.status === "active") {
        setRemainingUsage({
          imageGenerations: Infinity,
          dreamAnalyses: Infinity,
        });
      } else {
        // For non-active subscriptions, still fetch usage data
        await safelyFetchUsageData();
      }
      
      return;
    }
    
    setIsLoading(true);
    try {
      // Clear existing subscription data and fetch fresh data
      setSubscription(null);
      
      // Get previous status from localStorage
      const previousStatus = getPreviousStatus();
      
      // Call fetchSubscription logic again
      try {
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, status, customer_portal_url, stripe_customer_id, cancel_at_period_end, current_period_end, canceled_at")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (subscriptionError) {
          console.error("Error fetching subscription data:", subscriptionError);
          await safelyFetchUsageData();
          setIsLoading(false);
          return;
        }
        
        if (subscriptionData && subscriptionData.status === "active") {
          // For active & canceling subscriptions, check with Stripe for full details
          try {
            if (subscriptionData.subscription_id) {
              // Get current session
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              
              if (accessToken) {
                // Call the get-stripe-subscription endpoint to verify cancellation status
                const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'x-client-info': 'slumber-synthesizer/1.0.0'
                  },
                  body: JSON.stringify({
                    userId: user.id,
                    stripeCustomerId: subscriptionData.stripe_customer_id
                  })
                });
                
                if (fetchResponse.ok) {
                  // Successfully fetched subscription ID, check for cancellation
                  const stripeData = await fetchResponse.json();
                  
                  // Set subscription with proper cancellation status and generate display status
                  let isActive = stripeData.status === "active";
                  let isCanceling = isActive && stripeData.cancel_at_period_end;
                  
                  // Special case: "canceled" status from Stripe but still in paid period
                  // should be treated as "canceling"
                  if (stripeData.status === "canceled" && 
                     stripeData.current_period_end && 
                     new Date(stripeData.current_period_end * 1000) > new Date()) {
                    isActive = true;
                    isCanceling = true;
                    console.log("Detected canceled subscription still in paid period - treating as canceling");
                  }
                  
                  // Determine the display status based on Stripe values
                  let displayStatus: "active" | "canceling" | "inactive" = "inactive";
                  if (isActive) {
                    displayStatus = isCanceling ? "canceling" : "active";
                  }
                  
                  const subscriptionObj = {
                    id: subscriptionData.subscription_id || "",
                    status: isActive ? "active" : stripeData.status,
                    displayStatus,
                    planName: "Premium",
                    currentPeriodEnd: stripeData.current_period_end ? new Date(stripeData.current_period_end * 1000).toISOString() : null,
                    customerPortalUrl: subscriptionData.customer_portal_url || null,
                    cancelAtPeriodEnd: isCanceling || stripeData.cancel_at_period_end || false,
                    canceledAt: stripeData.canceled_at ? new Date(stripeData.canceled_at * 1000).toISOString() : null,
                  };
                  
                  setSubscription(subscriptionObj);
                  
                  // Cache the subscription data for faster loading
                  saveSubscriptionToCache(subscriptionObj);
                  
                  // Save status
                  saveStatusToStorage(displayStatus);
                  
                  // ALWAYS set unlimited for active subscribers and canceling subscribers within the paid period
                  setRemainingUsage({
                    imageGenerations: Infinity,
                    dreamAnalyses: Infinity,
                  });
                  
                  const statusToLog = stripeData.status === "active" && stripeData.cancel_at_period_end ? "canceling" : stripeData.status;
                  logStatusOnce(statusToLog);
                  
                  // Only show notification when status changes from non-active/non-canceling to active
                  // AND not on initial load/refresh if already active
                  showActivationToast(previousStatus);
                  
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (err) {
            console.error("Error checking cancellation status:", err);
          }
          
          // Fallback if Stripe check fails: Set subscription to active
          const subscriptionObj = {
            id: subscriptionData.subscription_id || "",
            status: "active",
            displayStatus: "active",
            planName: "Premium",
            currentPeriodEnd: null,
            customerPortalUrl: subscriptionData.customer_portal_url || null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          };
          
          setSubscription(subscriptionObj);
          
          // Cache the subscription data for faster loading
          saveSubscriptionToCache(subscriptionObj);
          
          // Always set unlimited for active subscribers
          setRemainingUsage({
            imageGenerations: Infinity,
            dreamAnalyses: Infinity,
          });
          
          // Only show notification when status changes from non-active to active
          if (previousStatus !== "active") {
            showActivationToast(previousStatus);
            saveStatusToStorage("active");
          }
        } else {
          // No active subscription, fall back to the Edge Function for more details
          try {
            // Get current session
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            
            if (!accessToken) {
              throw new Error("No authentication token available");
            }
            
            // Use the local proxy to avoid CORS issues
            const response = await fetch('/api/functions/v1/get-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-client-info': 'slumber-synthesizer/1.0.0'
              },
              body: JSON.stringify({ userId: user.id })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data?.subscription) {
              setSubscription(data.subscription);
              
              // If active from the API response, set unlimited usage
              if (data.subscription.status === "active") {
                setRemainingUsage({
                  imageGenerations: Infinity,
                  dreamAnalyses: Infinity,
                });
                
                saveStatusToStorage(data.subscription.status);
              } else {
                // Not active, use the free tier limits
                saveStatusToStorage(data.subscription.status);
                await safelyFetchUsageData();
              }
            } else {
              setSubscription(null);
              saveStatusToStorage(null);
              await safelyFetchUsageData();
            }
          } catch (error) {
            console.error('Error fetching subscription from API:', error);
            setSubscription(null);
            saveStatusToStorage(null);
            await safelyFetchUsageData();
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setSubscription(null);
        saveStatusToStorage(null);
        await safelyFetchUsageData();
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh your subscription status.",
      });
      await safelyFetchUsageData();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscription,
    isLoading,
    isUsageLoading,
    remainingUsage,
    hasReachedLimit,
    recordUsage,
    startCheckout,
    refreshUsage: safelyFetchUsageData,
    refreshSubscription,
    setSubscription,
    getReturnUrl,
  };
}; 