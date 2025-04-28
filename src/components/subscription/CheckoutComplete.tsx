import { useEffect, useState, useRef, useCallback } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Key used to prevent processing checkout multiple times
const CHECKOUT_PROCESSED_KEY = "checkout_processed";

export const CheckoutComplete = () => {
  const { refreshSubscription } = useSubscription();

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "canceled" | "unknown">(
    "unknown",
  );
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const didInitialRefresh = useRef(false);

  // --- Define functions wrapped in useCallback BEFORE useEffect ---

  const checkExistingSubscription = useCallback(async () => {
    if (!user) return false;
    // ... rest of function logic ...
    try {
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data && data.status === "active") {
        await refreshSubscription(); // Refresh state if found active
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking existing subscription:", error);
      return false;
    }
  }, [user, refreshSubscription]);

  const attemptVerificationViaStripeAPI = useCallback(async () => {
    if (!user) return; // Add guard clause
    // ... rest of function logic ...
    try {
      const { data: existingRecord } = await supabase
        .from("customer_subscriptions")
        .select("id, stripe_customer_id, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      // ... rest of error handling and logic ...
      if (existingRecord?.status === "active") {
        console.log("Already active, refreshing subscription");
        await refreshSubscription();
        setSubscriptionActivated(true);
        setLoading(false);
      } else {
        // ... logic if not active ...
      }
    } catch (err) {
      console.error("Error verifying subscription via Stripe API:", err);
      // ... error handling ...
      setLoading(false);
    }
  }, [user, refreshSubscription]);

  const verifyPaymentWithStripe = useCallback(
    async (sessionId: string | null) => {
      if (!user) return; // Add guard clause
      // ... rest of function logic ...
      try {
        // ... logic to get session, call API, etc. ...
        if (!sessionId) {
          await attemptVerificationViaStripeAPI();
          return;
        }
        // ... more logic ...
        // On success:
        await refreshSubscription();
        setLoading(false);
        setSubscriptionActivated(true);
        // On failure or error:
        // setLoading(false);
        // Potentially call attemptVerificationViaStripeAPI() as fallback
      } catch (err) {
        console.error("Error verifying payment with Stripe:", err);
        // ... error handling ...
        setLoading(false);
      }
    },
    [user, attemptVerificationViaStripeAPI, refreshSubscription],
  );

  // --- useEffect hook using the defined functions ---

  // Initial check for verification status
  useEffect(() => {
    if (user && !verificationAttempted) {
      setVerificationAttempted(true);
      checkExistingSubscription().then((isActive) => {
        if (isActive) {
          console.log(
            "Active subscription found during initial check, redirecting...",
          );
          setSubscriptionActivated(true);
          setLoading(false);
          setTimeout(() => {
            sessionStorage.setItem("from_checkout", "true");
            window.history.pushState({}, "", "/settings?tab=subscription");
            window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
          }, 1500);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const sessionId = urlParams.get("session_id");
          verifyPaymentWithStripe(sessionId);
        }
      });
    }
  }, [
    user,
    verificationAttempted,
    checkExistingSubscription,
    verifyPaymentWithStripe, // No longer depends on attemptVerificationViaStripeAPI directly here
  ]);

  // Clear any previously stored checkout state on component mount
  // This forces fresh verification every time the user visits this page
  useEffect(() => {
    // Remove any previously stored checkout state
    sessionStorage.removeItem(CHECKOUT_PROCESSED_KEY);

    // Only do initial refresh once per component lifetime
    if (!didInitialRefresh.current) {
      didInitialRefresh.current = true;
      // Also clear any potentially outdated subscription data from memory
      refreshSubscription().catch((err) => {
        console.error("Failed to refresh subscription data on mount:", err);
      });
    }

    // No need to refresh on unmount since we'll refresh when viewing the settings page
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
      console.log(
        "Invalid navigation to checkout complete page, redirecting to subscription tab",
      );

      // Immediately set loading to false to prevent showing loading UI
      setLoading(false);

      // No need to refresh subscription on invalid navigation
      // This prevents unnecessary API calls

      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem("from_checkout", "true");
      // Navigate to settings with tab parameter
      window.history.pushState({}, "", "/settings?tab=subscription");
      // Force a dispatch of popstate event to trigger route change without reload
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      return;
    } else if (isCanceled) {
      // For canceled checkout, redirect immediately without trying to verify
      console.log("Checkout was canceled, redirecting to subscription tab");

      // Immediately set loading to false to prevent showing loading UI
      setLoading(false);
      setStatus("canceled");

      // Set flag in session storage to indicate coming from checkout
      sessionStorage.setItem("from_checkout", "true");

      // Navigate to settings with tab parameter after a very short delay
      // This gives time for the component to update state
      setTimeout(() => {
        window.history.pushState({}, "", "/settings?tab=subscription");
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }, 100);
      return;
    }

    // Single verification attempt for success=true path
    if (isSuccess && !verificationAttempted && user) {
      setStatus("success");
      setVerificationAttempted(true);

      // We need to verify the payment with Stripe before activating
      checkExistingSubscription().then((hasActiveSubscription) => {
        if (!hasActiveSubscription) {
          if (sessionId) {
            console.log("Session ID found, verifying with Stripe");
            verifyPaymentWithStripe(sessionId);
          } else {
            console.warn(
              "No session_id in URL, attempting fallback verification",
            );
            attemptVerificationViaStripeAPI();
          }
        } else {
          // Already has active subscription, redirect to subscription tab
          setLoading(false);
          setSubscriptionActivated(true);

          // After a brief delay to show success UI, redirect
          setTimeout(() => {
            // Set flag in session storage to indicate coming from checkout
            sessionStorage.setItem("from_checkout", "true");
            window.history.pushState({}, "", "/settings?tab=subscription");
            window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
          }, 1500);
        }
      });
    }
  }, [
    user,
    verificationAttempted,
    checkExistingSubscription,
    attemptVerificationViaStripeAPI,
    verifyPaymentWithStripe,
  ]);

  const handleReturnToSettings = () => {
    // Set flag in session storage to indicate coming from checkout
    sessionStorage.setItem("from_checkout", "true");
    // Navigate to settings with tab parameter
    window.history.pushState({}, "", "/settings?tab=subscription");
    // Force a dispatch of popstate event to trigger route change without reload
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  };

  const handleReturnHome = () => {
    // Use history.pushState to avoid page reload
    window.history.pushState({}, "", "/");
    // Force a dispatch of popstate event to trigger route change without reload
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
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
            <CardTitle className="text-center">
              Verifying Subscription
            </CardTitle>
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
        <CardTitle className="text-center">Checkout Complete</CardTitle>
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
              <Button onClick={handleReturnToSettings}>Go to Settings</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
