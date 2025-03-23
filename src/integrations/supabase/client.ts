import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jduzfrjhxfxiyajvpkus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

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

// Export a function to refresh the session
export const refreshSession = async () => {
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
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  } catch (e) {
    console.error('Error getting current user:', e);
    return { user: null, error: e instanceof Error ? e : new Error('Unknown error') };
  }
};