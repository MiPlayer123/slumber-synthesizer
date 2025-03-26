import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables should be prefixed with VITE_ to be accessible in the client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jduzfrjhxfxiyajvpkus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

// Error utility for better error tracking
const logAndReturnError = (context: string, error: unknown): Error => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[Supabase ${context}]:`, err);
  // In production, you might want to send this to an error tracking service
  return err;
};

// Initialize the Supabase client with explicit options for session persistence
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
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
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout for better reliability
            
            if (options) {
              options.signal = controller.signal;
            } else {
              options = { signal: controller.signal };
            }
            
            // Add cache control headers for non-auth requests to prevent caching sensitive data
            if (!url.toString().includes('/auth/') && options?.headers) {
              const headers = new Headers(options.headers);
              headers.set('Cache-Control', 'no-store, max-age=0');
              options.headers = headers;
            }
            
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            // If we hit a 401 error, try to refresh the session once
            if (response.status === 401 && !url.toString().includes('/auth/')) {
              try {
                const refreshResult = await refreshSession();
                if (refreshResult.error) {
                  throw new Error('Session refresh failed');
                }
                // Retry the fetch with the new token
                return fetch(url, options);
              } catch (refreshError) {
                // If refresh fails, clear local session data to force re-login
                await supabase.auth.signOut({ scope: 'local' });
                throw new Error('Authentication expired. Please sign in again.');
              }
            }
            
            return response;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              throw new Error('Request timed out. Please check your internet connection and try again.');
            }
            
            if (retryCount < maxRetries) {
              retryCount++;
              // Exponential backoff with jitter for better distribution of retry attempts
              const delay = Math.pow(2, retryCount) * 100 + Math.random() * 100;
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
    // Add some debug info in development mode
    ...(import.meta.env.DEV ? { 
      debug: true 
    } : {})
  }
);

// Export a function to refresh the session
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      return { data, error: logAndReturnError('refreshSession', error) };
    }
    return { data, error };
  } catch (e) {
    return { data: null, error: logAndReturnError('refreshSession', e) };
  }
};

// Export additional helper functions
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null, error: logAndReturnError('getCurrentUser', error) };
    }
    return { user: data.user, error };
  } catch (e) {
    return { user: null, error: logAndReturnError('getCurrentUser', e) };
  }
};

// Check if the current session is valid
export const isSessionValid = async (): Promise<boolean> => {
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

// Safe data fetching utility to use throughout the app
export const safeFetch = async <T>(
  fetchFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    // First check if session is valid
    const sessionValid = await isSessionValid();
    if (!sessionValid) {
      return { data: null, error: new Error('Invalid session') };
    }
    
    const result = await fetchFn();
    if (result.error) {
      return { data: null, error: logAndReturnError('safeFetch', result.error) };
    }
    return { data: result.data, error: null };
  } catch (e) {
    return { data: null, error: logAndReturnError('safeFetch', e) };
  }
};