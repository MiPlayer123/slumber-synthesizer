import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fixStripeRedirectUrl } from "@/utils/urlUtils";
import { Loader2 } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Check if this is a checkout-complete URL with malformed parameters
    if (location.pathname.includes('checkout-complete&')) {
      setIsRedirecting(true);
      
      // Get the correct URL using our utility
      const fixedUrl = location.pathname.replace('&', '?');
      
      // Redirect to the correct path after a short delay
      setTimeout(() => {
        navigate(fixedUrl, { replace: true });
      }, 1000);
    }
  }, [location.pathname, navigate]);

  const handleReturnHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        {isRedirecting ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Fixing checkout URL, please wait...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Oops! Page not found</p>
            <Button onClick={handleReturnHome} className="w-full">
              Return to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default NotFound;
