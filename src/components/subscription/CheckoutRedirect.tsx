import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { fixStripeRedirectUrl } from "@/utils/urlUtils";

export const CheckoutRedirect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This component handles malformed URLs from Stripe

    const fixAndRedirect = () => {
      try {
        const url = window.location.href;
        console.log("Original URL:", url);

        // Check if this is a cancellation redirect
        if (url.includes("canceled=true")) {
          console.log("Detected cancellation, immediately redirecting");
          // Don't show loading UI for canceled checkouts
          setLoading(false);
          // Set flag in session storage to indicate coming from checkout
          sessionStorage.setItem("from_checkout", "true");
          // Use history.pushState to avoid page reload
          window.history.pushState({}, "", "/settings?tab=subscription");
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
          return;
        }

        // Handle specific case: /checkout-complete&success=true
        if (
          window.location.pathname.includes("checkout-complete&success=true")
        ) {
          // Use history.pushState to avoid page reload
          window.history.pushState({}, "", "/checkout-complete?success=true");
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
          return;
        }

        // Use our utility function to fix the URL
        const fixedUrl = fixStripeRedirectUrl(url);
        console.log("Fixed URL:", fixedUrl);

        // If the URL was fixed, navigate to it
        if (fixedUrl !== url) {
          // Extract the path part (without origin) for navigation
          const urlObj = new URL(fixedUrl);
          const pathWithSearch = urlObj.pathname + urlObj.search;

          console.log("Redirecting to:", pathWithSearch);
          // Use history.pushState to avoid page reload
          window.history.pushState({}, "", pathWithSearch);
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        } else {
          // Extract success or canceled parameter
          const parts = window.location.pathname.split("/");
          let query = "";

          // Handle different URL formats
          if (parts.length > 2) {
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes("success=true")) {
              query = "?success=true";
            } else if (lastPart.includes("canceled=true")) {
              query = "?canceled=true";
              // Don't show loading UI for canceled checkouts
              setLoading(false);
            }

            if (query) {
              // Navigate to the correct URL format
              // Use history.pushState to avoid page reload
              window.history.pushState({}, "", `/checkout-complete${query}`);
              // Force a dispatch of popstate event to trigger route change without reload
              window.dispatchEvent(
                new PopStateEvent("popstate", { state: {} }),
              );
              return;
            }
          }

          // If we can't fix it, go to the settings page
          console.error("URL could not be fixed:", window.location.href);
          toast({
            variant: "destructive",
            title: "Navigation Error",
            description:
              "There was a problem with the checkout process. Please check your subscription status.",
          });
          // Set flag in session storage to indicate coming from checkout
          sessionStorage.setItem("from_checkout", "true");
          // Don't show loading UI when redirecting to settings
          setLoading(false);
          // Use history.pushState to avoid page reload
          window.history.pushState({}, "", "/settings?tab=subscription");
          // Force a dispatch of popstate event to trigger route change without reload
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        }
      } catch (error) {
        console.error("Error in checkout redirect:", error);
        // Fallback to settings page
        // Set flag in session storage to indicate coming from checkout
        sessionStorage.setItem("from_checkout", "true");
        // Don't show loading UI when redirecting to settings
        setLoading(false);
        // Use history.pushState to avoid page reload
        window.history.pushState({}, "", "/settings?tab=subscription");
        // Force a dispatch of popstate event to trigger route change without reload
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }
    };

    // Run the fix immediately
    fixAndRedirect();
  }, [toast]);

  // Don't show anything if we're not loading
  if (!loading) {
    return null;
  }

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 mb-4" />
          <p className="text-center">Redirecting to checkout results...</p>
        </CardContent>
      </Card>
    </div>
  );
};
