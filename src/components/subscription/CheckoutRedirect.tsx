import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { fixStripeRedirectUrl } from "@/utils/urlUtils";

export const CheckoutRedirect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // This component handles malformed URLs from Stripe
    
    const fixAndRedirect = () => {
      try {
        const url = window.location.href;
        console.log("Original URL:", url);
        
        // Handle specific case: /checkout-complete&success=true
        if (window.location.pathname.includes('checkout-complete&success=true')) {
          navigate('/checkout-complete?success=true', { replace: true });
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
          // Navigate to the fixed URL
          navigate(pathWithSearch, { replace: true });
        } else {
          // Extract success or canceled parameter
          const parts = window.location.pathname.split('/');
          let query = '';
          
          // Handle different URL formats
          if (parts.length > 2) {
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('success=true')) {
              query = '?success=true';
            } else if (lastPart.includes('canceled=true')) {
              query = '?canceled=true';
            }
            
            if (query) {
              // Navigate to the correct URL format
              navigate(`/checkout-complete${query}`, { replace: true });
              return;
            }
          }
          
          // If we can't fix it, go to the settings page
          console.error('URL could not be fixed:', window.location.href);
          toast({
            variant: "destructive",
            title: "Navigation Error",
            description: "There was a problem with the checkout process. Please check your subscription status.",
          });
          navigate('/settings?tab=subscription', { replace: true });
        }
      } catch (error) {
        console.error('Error in checkout redirect:', error);
        // Fallback to settings page
        navigate('/settings?tab=subscription', { replace: true });
      }
    };
    
    // Run the fix immediately
    fixAndRedirect();
  }, [navigate, toast]);

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