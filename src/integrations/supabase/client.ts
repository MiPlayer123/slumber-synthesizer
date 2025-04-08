import { createClient, Session } from '@supabase/supabase-js';
import type { Database } from './types';

// Fixed values for Supabase URL and key
const SUPABASE_URL = "https://api.lucidrem.com";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

// Helper function to check if the configuration is valid
export const isValidSupabaseConfig = () => {
  return !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
};

// Log errors for missing configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Supabase configuration is incomplete. This will cause authentication errors.');
}

// Initialize the Supabase client with explicit options for session persistence
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://example.supabase.co', // Fallback to prevent crashes
  SUPABASE_PUBLISHABLE_KEY || 'public-anon-key', // Fallback to prevent crashes
  {
    auth: {
      persistSession: true, // Enable session persistence (default is true)
      storageKey: 'slumber-synthesizer-auth', // Custom storage key
      autoRefreshToken: true, // Automatically refresh the token
      detectSessionInUrl: true, // Detect session in URL (important for email verification)
      flowType: 'pkce', // Use PKCE flow for better security
    },
    // Global configuration for improved reliability
    global: {
      fetch: (url, options) => {
        // Add retry logic for network failures
        const maxRetries = 3;
        let retryCount = 0;
        
        const retryFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
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
            if (response.status === 401 && !url.toString().includes('/auth/')) {
              console.log("Detected 401 error, attempting to refresh session...");
              const { success, error: refreshError } = await refreshSession();
              
              if (success) {
                console.log("Session refreshed successfully, retrying original request.");
                // Retry the fetch with the new token
                // Clone options to avoid modifying the original signal
                const newOptions = { ...options }; 
                // Create a new AbortController for the retry in case the original timed out
                const retryController = new AbortController();
                const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
                newOptions.signal = retryController.signal;

                const retryResponse = await fetch(url, newOptions);
                clearTimeout(retryTimeoutId);
                return retryResponse; // Return the result of the retry
              } else {
                console.error("Failed to refresh session:", refreshError);
                // Optional: Trigger a global sign-out or show a message
                // For now, throw an error to stop the process
                throw new Error(`Session expired and could not be refreshed: ${refreshError?.message || 'Unknown error'}`);
              }
            }
            
            return response;
          } catch (error) {
            if (retryCount < maxRetries) {
              retryCount++;
              // Exponential backoff
              const delay = Math.pow(2, retryCount) * 100;
              await new Promise(resolve => setTimeout(resolve, delay));
              return retryFetch(url, options);
            }
            throw error;
          }
        };
        
        return retryFetch(url, options);
      },
      headers: {
        'X-Client-Info': 'slumber-synthesizer/1.0.0'
      },
    },
    // Add some debug info in development
    ...(import.meta.env.DEV ? { 
      debug: true 
    } : {})
  }
);

export const isSessionValid = async (): Promise<boolean> => {
  if (!isValidSupabaseConfig()) {
    console.error('Cannot check session: Supabase is not properly configured');
    return false;
  }

  try {
    const { data } = await supabase.auth.getSession();
    // Check if session exists AND if its expiration time is in the future
    // Use Date.now() for comparison
    return !!data.session && (data.session.expires_at * 1000) > Date.now();
  } catch (e) {
    // Log error but don't necessarily throw, return false
    console.error("[Supabase isSessionValid]:", e instanceof Error ? e.message : String(e));
    return false;
  }
};

// Export a function to refresh the session
export const refreshSession = async (): Promise<{ success: boolean; session: Session | null; error: Error | null }> => {
  if (!isValidSupabaseConfig()) {
    const error = new Error('Supabase is not properly configured');
    console.error('Cannot refresh session:', error.message);
    return { success: false, session: null, error };
  }

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session via Supabase client:', error);
      return { success: false, session: null, error };
    }
    if (!data.session) {
        const sessionError = new Error('No session returned after refresh');
        console.error('Error refreshing session:', sessionError.message);
        return { success: false, session: null, error: sessionError }
    }
    console.log("Session refreshed successfully in refreshSession function.");
    return { success: true, session: data.session, error: null };
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown exception during session refresh');
    console.error('Exception refreshing session:', error);
    return { success: false, session: null, error };
  }
};

// Export additional helper functions
export const getCurrentUser = async () => {
  if (!isValidSupabaseConfig()) {
    console.error('Cannot get current user: Supabase is not properly configured');
    return { user: null, error: new Error('Supabase is not properly configured') };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  } catch (e) {
    console.error('Error getting current user:', e);
    return { user: null, error: e instanceof Error ? e : new Error('Unknown error') };
  }
};