import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fixed values for Supabase URL and key
const SUPABASE_URL = "https://jduzfrjhxfxiyajvpkus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

// Set the application name that appears in auth screens
const APP_NAME = "REM - Dream Journal";

// Base URL for the application - adjust for different environments
const APP_URL = process.env.NODE_ENV === "production" 
  ? "https://lucidrem.com" 
  : "http://localhost:3000";

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
      // Customize auth UI using the correct property names
      debug: true
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
export const refreshSession = async () => {
  if (!isValidSupabaseConfig()) {
    console.error('Cannot refresh session: Supabase is not properly configured');
    return { data: null, error: new Error('Supabase is not properly configured') };
  }

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
    }
    return { data, error };
  } catch (e) {
    console.error('Exception refreshing session:', e);
    return { data: null, error: e instanceof Error ? e : new Error('Unknown error') };
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