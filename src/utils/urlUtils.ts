/**
 * Utility function to fix Stripe URL redirection issues
 * Stripe sometimes appends success/cancel params with & instead of ?
 * or appends them directly to the path
 */
export const fixStripeRedirectUrl = (url: string): string => {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Special case: Handle /checkout-complete&success=true or similar patterns
    if (path.includes("/checkout-complete&")) {
      // Replace & with ? to fix the URL format
      const fixedPath = path.replace("&", "?");
      return `${urlObj.origin}${fixedPath}${urlObj.search}`;
    }

    // Case 1: Check if the URL contains malformed parameters (like path&success=true)
    if (path.includes("&")) {
      // Extract the real path (before the first &)
      const realPath = path.split("&")[0];

      // Extract all the parameters from the malformed path
      const params = new URLSearchParams();

      // Get parameters from the malformed path
      const pathParts = path.split("&");
      pathParts.slice(1).forEach((part) => {
        if (part.includes("=")) {
          const [key, value] = part.split("=");
          params.append(key, value);
        }
      });

      // Add any existing search params
      const searchParams = new URLSearchParams(urlObj.search);
      searchParams.forEach((value, key) => {
        params.append(key, value);
      });

      // Construct a fixed URL
      const fixedUrl = `${urlObj.origin}${realPath}?${params.toString()}`;
      console.log(`Fixed Stripe URL (Case 1): ${url} → ${fixedUrl}`);
      return fixedUrl;
    }

    // Case 2: Check for path containing checkout-complete/success=true
    if (path.includes("/success=") || path.includes("/canceled=")) {
      const pathParts = path.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      const basePath = path.substring(0, path.lastIndexOf("/"));

      // Get the parameter value
      const params = new URLSearchParams();
      if (lastPart.includes("=")) {
        const [key, value] = lastPart.split("=");
        params.append(key, value);
      }

      // Add any existing search params
      const searchParams = new URLSearchParams(urlObj.search);
      searchParams.forEach((value, key) => {
        params.append(key, value);
      });

      // Construct a fixed URL
      const fixedUrl = `${urlObj.origin}${basePath}?${params.toString()}`;
      console.log(`Fixed Stripe URL (Case 2): ${url} → ${fixedUrl}`);
      return fixedUrl;
    }

    // URL is fine, no need to fix
    return url;
  } catch (error) {
    console.error("Error fixing Stripe URL:", error);
    return url; // Return original if there's an error
  }
};
