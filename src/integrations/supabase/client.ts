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
      fetch: fetch, // Use the browser's fetch
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
  const { data, error } = await supabase.auth.refreshSession();
  return { data, error };
};

// Export additional helper functions
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};