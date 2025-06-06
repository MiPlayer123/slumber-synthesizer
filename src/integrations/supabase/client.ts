import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Use environment variables for Supabase URL and key with fallbacks
// that match the actual values in .env file
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://api.lucidrem.com";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// In development mode, use the local proxy URL for Supabase
const isLocalDev =
  import.meta.env.DEV && window.location.hostname === "localhost";
const baseUrl = isLocalDev ? window.location.origin + "/api" : SUPABASE_URL;

// Helper function to check if the configuration is valid
export const isValidSupabaseConfig = () => {
  return !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
};

// Log errors for missing configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "Supabase configuration is incomplete. This will cause authentication errors.",
  );
}

console.log("Supabase URL:", baseUrl); // Debug log

// Initialize the Supabase client with explicit options for session persistence
export const supabase = createClient<Database>(
  SUPABASE_URL, // Always use the real URL for auth
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true, // Enable session persistence (default is true)
      storageKey: "slumber-synthesizer-auth", // Custom storage key
      autoRefreshToken: true, // Automatically refresh the token
      detectSessionInUrl: true, // Detect session in URL (important for email verification)
      flowType: "pkce", // Use PKCE flow for better security
    },
    // Global configuration for improved reliability
    global: {
      fetch: (url, options) => {
        // In development, rewrite the URL to use the local proxy
        let finalUrl = url;
        if (isLocalDev && typeof url === "string") {
          // Proxy REST API calls but not auth calls
          if (url.includes("/rest/v1/")) {
            finalUrl = url.replace(SUPABASE_URL, baseUrl);
          }
        }

        // Add retry logic for network failures
        const maxRetries = 3;
        let retryCount = 0;

        const retryFetch = async (
          url: RequestInfo | URL,
          options?: RequestInit,
        ): Promise<Response> => {
          try {
            // Use the browser's fetch with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

            if (options) {
              options.signal = controller.signal;
            } else {
              options = { signal: controller.signal };
            }

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            // If we hit a 401 error, try to refresh the session once
            if (response.status === 401 && !url.toString().includes("/auth/")) {
              await refreshSession();
              // Retry the fetch with the new token
              return fetch(url, options);
            }

            return response;
          } catch (error) {
            if (retryCount < maxRetries) {
              retryCount++;
              // Exponential backoff
              const delay = Math.pow(2, retryCount) * 100;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return retryFetch(url, options);
            }
            throw error;
          }
        };

        return retryFetch(finalUrl, options);
      },
      headers: {
        "X-Client-Info": "slumber-synthesizer/1.0.0",
      },
    },
    // Add some debug info in development
    ...(import.meta.env.DEV
      ? {
          debug: true,
        }
      : {}),
  },
);

export const isSessionValid = async (): Promise<boolean> => {
  if (!isValidSupabaseConfig()) {
    console.error("Cannot check session: Supabase is not properly configured");
    return false;
  }

  try {
    const { data } = await supabase.auth.getSession();
    // Check if session exists AND if its expiration time is in the future
    // Use Date.now() for comparison
    return !!data.session && data.session.expires_at * 1000 > Date.now();
  } catch (e) {
    // Log error but don't necessarily throw, return false
    console.error(
      "[Supabase isSessionValid]:",
      e instanceof Error ? e.message : String(e),
    );
    return false;
  }
};

// Export a function to refresh the session
export const refreshSession = async () => {
  if (!isValidSupabaseConfig()) {
    console.error(
      "Cannot refresh session: Supabase is not properly configured",
    );
    return {
      data: null,
      error: new Error("Supabase is not properly configured"),
    };
  }

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Error refreshing session:", error);
    }
    return { data, error };
  } catch (e) {
    console.error("Exception refreshing session:", e);
    return {
      data: null,
      error: e instanceof Error ? e : new Error("Unknown error"),
    };
  }
};

// Export additional helper functions
export const getCurrentUser = async () => {
  if (!isValidSupabaseConfig()) {
    console.error(
      "Cannot get current user: Supabase is not properly configured",
    );
    return {
      user: null,
      error: new Error("Supabase is not properly configured"),
    };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  } catch (e) {
    console.error("Error getting current user:", e);
    return {
      user: null,
      error: e instanceof Error ? e : new Error("Unknown error"),
    };
  }
};
