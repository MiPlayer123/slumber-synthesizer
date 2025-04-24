import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/supabase";

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

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [remainingUsage, setRemainingUsage] = useState<UsageData>({
    imageGenerations: 3,
    dreamAnalyses: 3,
  });
  const [isLoading, setIsLoading] = useState(true);
  
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
                    console.log("Retrieved subscription_id from Stripe:", stripeData.subscription_id);
                    
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
                  
                  console.log("Subscription status checked with Stripe: ", 
                    stripeData.status === "active" && stripeData.cancel_at_period_end ? "canceling" : stripeData.status);
                  
                  // Only show notification when status changes from non-active/non-canceling to active
                  // AND not on initial load/refresh if already active
                  if (previousStatus !== "active" && previousStatus !== "canceling") {
                    toast({
                      title: "Premium Active",
                      description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
                    });
                  }
                  
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
            toast({
              title: "Premium Active",
              description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
            });
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
              toast({
                title: "Premium Active",
                description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
              });
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
                  toast({
                    title: "Premium Active",
                    description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
                  });
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
                  
                  console.log("Post-Stripe portal refresh: Subscription status checked with Stripe: ", 
                    isCanceling ? "canceling" : stripeData.status);
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
      
      if (tabParam === 'subscription' && user) {
        console.log("Detected return from Stripe portal, refreshing subscription data");
        // Wait a moment to ensure page is fully loaded
        setTimeout(() => {
          refreshFromStripe().catch(err => {
            console.error("Error refreshing subscription after returning from Stripe:", err);
          });
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
    try {
      await fetchUsageData();
    } catch (error) {
      console.error("Error in safelyFetchUsageData:", error);
      // Use default free tier values in case of ANY error
      setRemainingUsage({
        imageGenerations: 3,
        dreamAnalyses: 3,
      });
    }
  };

  // Fetch usage data from the database - only needed for free tier
  const fetchUsageData = async () => {
    if (!user) return;
    
    // Skip if user has active subscription - they should always have unlimited access
    if (subscription?.status === "active") {
      setRemainingUsage({
        imageGenerations: Infinity,
        dreamAnalyses: Infinity,
      });
      return;
    }
    
    // For canceling subscriptions, check if they're still within their paid period
    if (subscription?.status === "canceling" && subscription?.currentPeriodEnd) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      if (now < endDate) {
        // Still have unlimited access until end date
        setRemainingUsage({
          imageGenerations: Infinity,
          dreamAnalyses: Infinity,
        });
        return;
      }
    }

    try {
      // Get the current week's start date (Sunday)
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
      startOfWeek.setUTCHours(0, 0, 0, 0);
      const startDateStr = startOfWeek.toISOString();

      // Default values - free tier limits
      const freeImageLimit = 3;
      const freeAnalysisLimit = 3;
      
      // Fallback values - assume maximum usage in case of any errors
      let imageCount = 0;
      let analysisCount = 0;
      
      // Avoid all RPC calls in development mode to prevent 404 errors
      const isDevelopment = import.meta.env.DEV;
      
      if (!isDevelopment) {
        try {
          // Count dream images using SQL function
          const { count: imageCountResult, error: imageError } = await supabase.rpc(
            'count_user_images_since',
            { 
              user_id_input: user.id,
              since_date: startDateStr
            }
          );
          
          if (!imageError && imageCountResult !== null) {
            imageCount = imageCountResult;
          }
          
          // Count dream analyses using SQL function - only call in production
          const { count: analysisCountResult, error: analysisError } = await supabase.rpc(
            'count_user_analyses_since',
            { 
              user_id_input: user.id,
              since_date: startDateStr
            }
          );
          
          if (!analysisError && analysisCountResult !== null) {
            analysisCount = analysisCountResult;
          }
        } catch (error) {
          console.error("Error counting using RPC functions:", error);
        }
      } else {
        console.log("Skipping RPC functions in development mode");
        // Use fallback method for development
        
        // Count images manually by querying dreams table
        try {
          const { data: images, error: imagesError } = await supabase
            .from('dreams')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', startDateStr)
            .not('image_url', 'is', null);
            
          if (!imagesError && images) {
            imageCount = images.length;
          }
          
          // Count analyses manually by querying dream_analyses table
          try {
            // First try with direct query using user_id
            const { data: analyses, error: analysesError } = await supabase
              .from('dream_analyses')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', startDateStr);
            
            if (!analysesError && analyses) {
              analysisCount = analyses.length;
            } else if (analysesError && analysesError.code === '42703' && 
                      analysesError.message.includes('user_id')) {
              // If user_id column doesn't exist, use a more compatible approach
              console.log("Falling back to alternative query for analyses count due to missing user_id");
              
              // First get all the user's dreams
              const { data: userDreams, error: userDreamsError } = await supabase
                .from('dreams')
                .select('id')
                .eq('user_id', user.id);
                
              if (!userDreamsError && userDreams && userDreams.length > 0) {
                // Get dream IDs
                const dreamIds = userDreams.map(dream => dream.id);
                
                // Then count analyses for those dreams
                const { data: dreamAnalyses, error: dreamAnalysesError } = await supabase
                  .from('dream_analyses')
                  .select('id')
                  .in('dream_id', dreamIds)
                  .gte('created_at', startDateStr);
                  
                if (!dreamAnalysesError && dreamAnalyses) {
                  analysisCount = dreamAnalyses.length;
                } else if (dreamAnalysesError) {
                  console.error("Error querying analyses by dream_id:", dreamAnalysesError);
                }
              } else if (userDreamsError) {
                console.error("Error querying user dreams:", userDreamsError);
              }
            }
          } catch (error) {
            console.error("Error counting dream analyses:", error);
          }
        } catch (error) {
          console.error("Error counting using direct queries:", error);
        }
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
        imageGenerations: 3,
        dreamAnalyses: 3,
      });
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
    
    if (type === 'image') {
      return remainingUsage.imageGenerations <= 0;
    } else {
      return remainingUsage.dreamAnalyses <= 0;
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
    
    // For free tier users, decrement the local counter
    if (type === 'image') {
      setRemainingUsage(prev => ({
        ...prev,
        imageGenerations: Math.max(0, prev.imageGenerations - 1)
      }));
    } else {
      setRemainingUsage(prev => ({
        ...prev,
        dreamAnalyses: Math.max(0, prev.dreamAnalyses - 1)
      }));
    }
  };

  // Start the checkout process
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

      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Authentication required. Please sign in again.");
      }

      // Call the create-checkout Edge Function with explicit headers
      // Use the local proxy to avoid CORS issues
      const response = await fetch('/api/functions/v1/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-client-info': 'slumber-synthesizer/1.0.0'
        },
        body: JSON.stringify({
          userId: user.id,
          planId,
          returnUrl: returnUrl || window.location.origin + '/checkout-complete'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', response.status, errorData);
        throw new Error(`Failed to create checkout session: ${response.status} ${errorData}`);
      }

      const data = await response.json();

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
                  
                  console.log("Subscription status checked with Stripe: ", 
                    stripeData.status === "active" && stripeData.cancel_at_period_end ? "canceling" : stripeData.status);
                  
                  // Only show notification when status changes from non-active/non-canceling to active
                  // AND not on initial load/refresh if already active
                  if (previousStatus !== "active" && previousStatus !== "canceling") {
                    toast({
                      title: "Premium Active",
                      description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
                    });
                  }
                  
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
            toast({
              title: "Premium Active",
              description: "Your premium subscription is active. You have unlimited dream analyses and image generations!",
            });
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
    remainingUsage,
    hasReachedLimit,
    recordUsage,
    startCheckout,
    refreshUsage: fetchUsageData,
    refreshSubscription,
    setSubscription,
  };
}; 