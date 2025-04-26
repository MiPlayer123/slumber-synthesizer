// Site URLs
export const SITE_URL = 'https://lucidrem.com';

// URL helpers
export const getSiteUrl = () => {
  // In development mode, you might want to use the local URL for some features
  // but for Stripe integrations, always use the production URL
  // This prevents issues with localhost redirects from stripe
  return SITE_URL;
};

// URL paths for Stripe redirects
export const STRIPE_RETURN_PATHS = {
  SETTINGS: '/settings?tab=subscription',
  CHECKOUT_COMPLETE: '/checkout-complete',
};

// Dynamic URL helper that works on any domain (localhost, staging, production)
export const makeReturnUrl = (path: string) => {
  // window.location.origin already contains protocol, host and port
  // e.g., http://localhost:5173 or https://lucidrem.com
  return new URL(path, window.location.origin).toString();
}; 