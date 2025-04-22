import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Key used to prevent processing checkout multiple times
const CHECKOUT_PROCESSED_KEY = "checkout_processed";

export const CheckoutComplete = () => {
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "canceled" | "unknown">("unknown");
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);

  useEffect(() => {
    // Check if we've already processed this checkout to prevent duplicate processing
    const checkoutProcessed = sessionStorage.getItem(CHECKOUT_PROCESSED_KEY);
    if (checkoutProcessed === "true") {
      setLoading(false);
      setStatus("success");
      setSubscriptionActivated(true);
      return;
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";
    const shouldAutoClose = searchParams.get("auto_close") === "true";
    
    // Log once, not repeatedly
    console.log("Checkout complete params:", { isSuccess, isCanceled, shouldAutoClose });

    if (isSuccess) {
      setStatus("success");
      
      // Mark as processed to prevent duplicate processing on re-renders
      sessionStorage.setItem(CHECKOUT_PROCESSED_KEY, "true");
      
      // Directly update the database to force activate subscription
      if (user) {
        const activateSubscription = async () => {
          try {
            // First check if a record exists
            const { data: existingRecord, error: checkError } = await supabase
              .from("customer_subscriptions")
              .select("id, subscription_status, stripe_customer_id")
              .eq("user_id", user.id)
              .maybeSingle();
              
            // Skip DB updates if subscription is already active
            if (!checkError && existingRecord?.subscription_status === "active") {
              console.log("Subscription already active, skipping update");
              setLoading(false);
              setSubscriptionActivated(true);
              return;
            }
              
            if (!checkError && existingRecord) {
              // Update existing record - ALWAYS SET subscription_status to 'active'
              await supabase
                .from("customer_subscriptions")
                .update({
                  subscription_status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", user.id);
              
              console.log("Updated subscription status to active");
              
              // If we have a stripe_customer_id but no subscription_id, try to fetch it
              if (existingRecord.stripe_customer_id && !('subscription_id' in existingRecord && existingRecord.subscription_id)) {
                try {
                  // Get the current session for auth
                  const { data: sessionData } = await supabase.auth.getSession();
                  const accessToken = sessionData?.session?.access_token;
                  
                  if (accessToken) {
                    // Call our new endpoint to fetch and store the subscription ID
                    const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'x-client-info': 'slumber-synthesizer/1.0.0'
                      },
                      body: JSON.stringify({
                        userId: user.id,
                        stripeCustomerId: existingRecord.stripe_customer_id
                      })
                    });
                    
                    if (fetchResponse.ok) {
                      const fetchData = await fetchResponse.json();
                      console.log("Successfully retrieved subscription ID:", fetchData.subscription_id);
                    } else {
                      console.error("Failed to fetch subscription ID:", await fetchResponse.text());
                    }
                  }
                } catch (subIdError) {
                  console.error("Error fetching subscription ID:", subIdError);
                }
              }
            } else if (!checkError) {
              // Insert new record if none exists - with subscription_status as 'active'
              await supabase
                .from("customer_subscriptions")
                .insert({
                  user_id: user.id,
                  subscription_status: 'active',
                  subscription_id: 'stripe-subscription',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              
              console.log("Created new subscription record with active status");
            }
            
            // Only refresh subscription once after updating the database
            refreshSubscription()
              .then(() => {
                setLoading(false);
                setSubscriptionActivated(true);
                
                // If auto_close is set, redirect after successful refresh
                if (shouldAutoClose) {
                  setTimeout(() => {
                    navigate("/", { replace: true });
                  }, 2000);
                }
              })
              .catch((error) => {
                console.error("Error refreshing subscription:", error);
                setLoading(false);
              });
            
          } catch (error) {
            console.error("Error setting subscription active:", error);
            setLoading(false);
          }
        };
        
        activateSubscription();
      }
    } else if (isCanceled) {
      setStatus("canceled");
      setLoading(false);
    } else {
      setLoading(false);
    }
    
    // Cleanup function to navigate away if user stays too long on the checkout page
    return () => {
      // No cleanup needed
    };
  }, [user?.id]); // Only depend on user ID, not the entire deps to avoid re-runs

  const handleReturnToSettings = () => {
    navigate("/settings?tab=subscription");
  };

  const handleReturnHome = () => {
    navigate("/");
  };

  const handleForceActivate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Direct database update to fix subscription
      const { error } = await supabase
        .from("customer_subscriptions")
        .update({
          subscription_status: 'active'
        })
        .eq("user_id", user.id);
      
      if (error) {
        // Try insert if update failed
        const { error: insertError } = await supabase
          .from("customer_subscriptions")
          .insert({
            user_id: user.id,
            subscription_id: 'manual-activation',
            subscription_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error("Failed to create subscription:", insertError);
          toast({
            variant: "destructive",
            title: "Activation Failed",
            description: "Could not activate subscription manually."
          });
        }
      }
      
      // Refresh subscription
      await refreshSubscription();
      setSubscriptionActivated(true);
      
      toast({
        title: "Subscription Activated",
        description: "Your subscription has been manually activated."
      });
      
      // Navigate to home
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error("Error activating subscription:", error);
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: "Could not activate subscription manually."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Processing...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Payment Successful
              </>
            ) : status === "canceled" ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Payment Canceled
              </>
            ) : (
              "Checkout Complete"
            )}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Updating your subscription status..."
              : status === "success"
              ? "Your premium subscription is now active."
              : status === "canceled"
              ? "Your payment was canceled. No charges were made."
              : "You've completed the checkout process."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            {status === "success"
              ? "Enjoy unlimited dream analyses and image generations!"
              : status === "canceled"
              ? "You can try again anytime from the subscription page."
              : "Please return to the settings page to verify your subscription status."}
          </p>
          
          <div className="flex flex-col gap-3">
            {status === "success" && !subscriptionActivated && (
              <div className="p-3 border border-yellow-200 rounded-md bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/30 mb-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  If your subscription doesn't activate automatically, click the button below.
                </p>
              </div>
            )}
            
            <div className="flex justify-center gap-2">
              <Button onClick={handleReturnToSettings} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  "Settings"
                )}
              </Button>
              
              {status === "success" && !loading && (
                <Button onClick={handleReturnHome}>
                  Go to Home
                </Button>
              )}
            </div>
            
            {status === "success" && !loading && !subscriptionActivated && (
              <Button onClick={handleForceActivate} variant="outline" className="mt-3">
                Force Activate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 