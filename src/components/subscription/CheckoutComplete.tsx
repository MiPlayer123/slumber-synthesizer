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
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Clear any previously stored checkout state on component mount
  // This forces fresh verification every time the user visits this page
  useEffect(() => {
    // Remove any previously stored checkout state
    sessionStorage.removeItem(CHECKOUT_PROCESSED_KEY);
    
    // Also clear any potentially outdated subscription data from memory
    refreshSubscription().catch(err => {
      console.error("Failed to refresh subscription data on mount:", err);
    });
    
    // Any time this component unmounts, make sure to refresh subscription data
    return () => {
      refreshSubscription().catch(err => {
        console.error("Failed to refresh subscription data on unmount:", err);
      });
    };
  }, [refreshSubscription]);

  // Immediate redirect if user has just navigated here without a success parameter
  // This handles when users hit back button from Stripe or navigate directly to this URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";
    const sessionId = searchParams.get("session_id");
    
    // If there's no success=true AND no session_id AND no canceled=true,
    // assume it's an invalid navigation - redirect immediately
    if (!isSuccess && !sessionId && !isCanceled) {
      console.log("Invalid navigation to checkout complete page, redirecting to subscription tab");
      
      // Immediately set loading to false to prevent showing loading UI
      setLoading(false);
      
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  }, []);

  useEffect(() => {
    // We no longer need this check since we're forcing fresh verification every time
    // by clearing sessionStorage on mount
    
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";
    const shouldAutoClose = searchParams.get("auto_close") === "true";
    const sessionId = searchParams.get("session_id");
    
    // Log once, not repeatedly
    console.log("Checkout complete params:", { isSuccess, isCanceled, shouldAutoClose, sessionId });

    // For canceled or unknown status, or failed payment, redirect to subscription tab immediately
    if (isCanceled) {
      console.log("Checkout was canceled, redirecting to subscription tab");
      
      // Immediately set loading to false to prevent showing loading UI
      setLoading(false);
      
      // Update status to reflect cancellation
      setStatus("canceled");
      
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      return;
    }

    // If there's success=true but no session_id, this is suspicious - it might
    // be someone manually navigating or changing the URL - verify more carefully
    if (isSuccess && !sessionId) {
      console.log("Success flag with no session ID, will verify extra carefully");
    }

    // First check if the user already has an active subscription
    const checkExistingSubscription = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, subscription_status, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();
          
        // Only consider as active if it has a valid subscription_id, status is active,
        // and the current_period_end is in the future
        if (!error && data && 
            data.subscription_id && 
            data.subscription_status === 'active' &&
            data.current_period_end && 
            new Date(data.current_period_end) > new Date()) {
          console.log("Found existing active subscription:", data);
          setLoading(false);
          setStatus("success");
          setSubscriptionActivated(true);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error checking existing subscription:", err);
        return false;
      }
    };

    if (isSuccess) {
      setStatus("success");
      
      // We need to verify the payment with Stripe before activating
      if (user && !verificationAttempted) {
        checkExistingSubscription().then(hasActiveSubscription => {
          if (!hasActiveSubscription) {
            setVerificationAttempted(true);
            if (sessionId) {
              console.log("Session ID found, verifying with Stripe:", sessionId);
              verifyPaymentWithStripe(sessionId);
            } else {
              console.warn("No session_id in URL, attempting fallback verification");
              attemptVerificationViaStripeAPI();
            }
          }
        });
      }
    } else {
      // For unknown status, redirect to subscription tab 
      console.log("Checkout status unknown, redirecting to subscription tab");
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  }, [user, verificationAttempted]);

  // Verify the payment directly with Stripe
  const verifyPaymentWithStripe = async (sessionId: string | null) => {
    try {
      if (!user) {
        console.error("Cannot verify payment: User not logged in");
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }

      // If no session_id is provided, attempt to get it from Stripe via endpoint
      if (!sessionId) {
        console.log("No session_id provided, attempting to verify via Stripe customer ID");
        await attemptVerificationViaStripeAPI();
        return;
      }

      // Get the current session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        console.error("No access token available");
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      console.log("Calling get-stripe-subscription endpoint with session:", sessionId);
      
      // Call the get-stripe-subscription API to verify payment
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('get-stripe-subscription', {
          body: {
            sessionId // This is the primary parameter for this API
          }
        });
        
        if (verifyError) {
          console.error("Failed to verify payment:", verifyError);
          
          // Attempt fallback verification
          console.log("Attempting fallback verification via Stripe API");
          await attemptVerificationViaStripeAPI();
          return;
        }
        
        console.log("Payment verification response:", verifyData);
        
        if (verifyData.success && verifyData.subscription_id) {
          console.log("Payment verified with Stripe:", verifyData);
          
          // Check for payment_failed status
          if (verifyData.payment_failed) {
            console.log("Payment failed detected, redirecting to subscription tab");
            // Set flag in session storage to indicate coming from checkout
            sessionStorage.setItem('from_checkout', 'true');
            // Navigate to settings with tab parameter
            window.history.pushState({}, '', '/settings?tab=subscription');
            // Force a dispatch of popstate event to trigger route change without reload
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            return;
          }
          
          // Refresh subscription data
          try {
            console.log("Refreshing subscription data from context");
            await refreshSubscription();
            console.log("Subscription data refreshed");
            
            setLoading(false);
            setSubscriptionActivated(true);
          } catch (refreshError) {
            console.error("Error refreshing subscription:", refreshError);
            setLoading(false);
            // Set flag in session storage to indicate coming from checkout
            sessionStorage.setItem('from_checkout', 'true');
            // Navigate to settings with tab parameter
            window.history.pushState({}, '', '/settings?tab=subscription');
            // Force a dispatch of popstate event to trigger route change without reload
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            return;
          }
        } else {
          console.error("Payment verification failed:", verifyData);
          // Try fallback method if verify-payment didn't confirm success
          await attemptVerificationViaStripeAPI();
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      setLoading(false);
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  };

  // Attempt verification using the Stripe API directly
  const attemptVerificationViaStripeAPI = async () => {
    try {
      // First check if we have a subscription record
      const { data: existingRecord, error: checkError } = await supabase
        .from("customer_subscriptions")
        .select("id, stripe_customer_id, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking customer record:", checkError);
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      // Check for payment_failed status in database
      if (existingRecord?.status === "past_due" || existingRecord?.status === "unpaid") {
        console.log("Payment failed status found in database, redirecting to subscription tab");
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      // Check for expired subscription
      if (existingRecord?.current_period_end && new Date(existingRecord.current_period_end) <= new Date()) {
        console.log("Subscription expired, redirecting to subscription tab");
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      if (!existingRecord?.stripe_customer_id) {
        console.error("No customer record found for verification");
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      // Get the current session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        console.error("No access token available");
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      // Try to verify using the old endpoint first for compatibility
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke('verify-payment', {
        body: {
          userId: user.id,
          sessionId: "fallback" // This won't match a real session, but it will trigger verification logic
        }
      });
      
      if (fetchError) {
        console.error("Failed to fetch subscription from Stripe:", fetchError);
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      // If we got a subscription ID and status is active, we can trust it
      if (fetchData.subscriptionId && fetchData.verified) {
        console.log("Found active subscription via Stripe API:", fetchData);
        
        // Check for payment_failed status
        if (fetchData.payment_failed) {
          console.log("Payment failed detected from API response, redirecting to subscription tab");
          // Set flag in session storage to indicate coming from checkout
          sessionStorage.setItem('from_checkout', 'true');
          // Navigate to settings with tab parameter
          window.history.pushState({}, '', '/settings?tab=subscription');
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          return;
        }
        
        // Now call updateSubscriptionStatus which uses upsert logic
        await updateSubscriptionStatus(fetchData.subscriptionId);
      } else {
        console.log("No active subscription found via Stripe API:", fetchData);
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      }
    } catch (error) {
      console.error("Error validating via Stripe API:", error);
      setLoading(false);
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  };

  // Update the subscription status in the database
  const updateSubscriptionStatus = async (subscriptionId: string) => {
    try {
      if (!user) {
        console.error("Cannot update subscription: User not logged in");
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      console.log(`Updating subscription status for ID: ${subscriptionId}`);
      
      // First check if we already have a record for this subscription
      const { data: existingRecord, error: checkError } = await supabase
        .from("customer_subscriptions")
        .select("id, subscription_id, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking existing record:", checkError);
      } else if (existingRecord) {
        console.log("Found existing subscription record:", existingRecord);
        
        // Check for payment_failed status in database
        if (existingRecord.status === "past_due" || existingRecord.status === "unpaid") {
          console.log("Payment failed status found in database, redirecting to subscription tab");
          // Set flag in session storage to indicate coming from checkout
          sessionStorage.setItem('from_checkout', 'true');
          // Navigate to settings with tab parameter
          window.history.pushState({}, '', '/settings?tab=subscription');
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          return;
        }
        
        // Check for expired subscription
        if (existingRecord.current_period_end && new Date(existingRecord.current_period_end) <= new Date()) {
          console.log("Subscription expired, redirecting to subscription tab");
          // Set flag in session storage to indicate coming from checkout
          sessionStorage.setItem('from_checkout', 'true');
          // Navigate to settings with tab parameter
          window.history.pushState({}, '', '/settings?tab=subscription');
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          return;
        }
      }
      
      // Try to get the full subscription details from Stripe directly
      let currentPeriodEnd = null;
      let status = "active";
      
      try {
        // Get the current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        if (accessToken) {
          // Call get-stripe-subscription with the subscription ID to get full details
          const { data, error: stripeError } = await supabase.functions.invoke('get-stripe-subscription', {
            body: {
              subscriptionId: subscriptionId
            }
          });
          
          if (!stripeError && data) {
            if (data.success && data.current_period_end) {
              currentPeriodEnd = data.current_period_end;
              status = data.status || "active";
            }
          }
        }
      } catch (error) {
        console.error("Error fetching subscription details from Stripe:", error);
      }
      
      // Update the subscription record with Stripe data
      const { error } = await supabase
        .from("customer_subscriptions")
        .update({
          subscription_id: subscriptionId,
          status: status, 
          updated_at: new Date().toISOString(),
          ...(currentPeriodEnd && { current_period_end: currentPeriodEnd })
        })
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error updating subscription:", error);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      console.log("Successfully updated subscription status");
      
      // Verify the update was successful by querying again
      const { data: verifyData, error: verifyError } = await supabase
        .from("customer_subscriptions")
        .select("subscription_id, subscription_status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (verifyError) {
        console.error("Error verifying update:", verifyError);
      } else {
        console.log("Verified database state after update:", verifyData);
        
        // Make sure subscription is active and not expired
        const isActive = verifyData?.subscription_id === subscriptionId && 
                        verifyData?.subscription_status === 'active';
        const isExpired = verifyData?.current_period_end && 
                         new Date(verifyData.current_period_end) <= new Date();
        
        if (isActive && !isExpired) {
          console.log("Database update verified successful!");
        } else {
          console.warn("Database update may not have succeeded - state doesn't match expected");
          if (isExpired) {
            console.error("Subscription appears to be expired");
            // Set flag in session storage to indicate coming from checkout
            sessionStorage.setItem('from_checkout', 'true');
            // Navigate to settings with tab parameter
            window.history.pushState({}, '', '/settings?tab=subscription');
            // Force a dispatch of popstate event to trigger route change without reload
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            return;
          }
        }
      }
      
      // Refresh subscription data
      try {
        console.log("Refreshing subscription data from context");
        await refreshSubscription();
        console.log("Subscription data refreshed");
      } catch (refreshError) {
        console.error("Error refreshing subscription:", refreshError);
        setLoading(false);
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem('from_checkout', 'true');
        // Navigate to settings with tab parameter
        window.history.pushState({}, '', '/settings?tab=subscription');
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
      
      setLoading(false);
      setSubscriptionActivated(true);
    } catch (error) {
      console.error("Error updating subscription status:", error);
      setLoading(false);
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  };

  const handleReturnToSettings = () => {
    // Set flag in session storage to indicate coming from checkout
    sessionStorage.setItem('from_checkout', 'true');
    // Navigate to settings with tab parameter
    window.history.pushState({}, '', '/settings?tab=subscription');
    // Force a dispatch of popstate event to trigger route change without reload
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  };

  const handleReturnHome = () => {
    // Use history.pushState to avoid page reload
    window.history.pushState({}, '', '/');
    // Force a dispatch of popstate event to trigger route change without reload
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  };

  const handleForceActivate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await attemptVerificationViaStripeAPI();
    } catch (error) {
      console.error("Error during force activation:", error);
      setLoading(false);
      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem('from_checkout', 'true');
      // Navigate to settings with tab parameter
      window.history.pushState({}, '', '/settings?tab=subscription');
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  };

  // Only render successful checkout content
  if (status !== "success" || !subscriptionActivated) {
    // While loading or verifying, show nothing
    if (loading) {
      // Check if we're in a canceled state or backing out, don't show loading UI in that case
      const searchParams = new URLSearchParams(window.location.search);
      const isCanceled = searchParams.get("canceled") === "true";
      
      // Don't show loading UI for canceled checkouts or other non-success states
      if (isCanceled || status === "canceled") {
        return null;
      }
      
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Verifying Subscription</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify your payment...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-center text-muted-foreground">
                Checking your subscription status...
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null; // Don't render anything else for non-success states
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Checkout Complete
        </CardTitle>
        <CardDescription className="text-center">
          Thank you for your subscription!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-center text-muted-foreground">
              Setting up your subscription...
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center">
                Your premium subscription is now active.
              </p>
            </div>
            <div className="flex flex-row space-x-4 mt-6">
              <Button variant="outline" onClick={handleReturnHome}>
                Return Home
              </Button>
              <Button onClick={handleReturnToSettings}>
                Go to Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 