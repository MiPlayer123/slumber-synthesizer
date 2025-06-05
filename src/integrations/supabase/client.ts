import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
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
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error("Error refreshing session:", error);
  }
  return data;
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

// Helper function to check if the configuration is valid
export const isValidSupabaseConfig = () => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Log errors for missing configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Supabase configuration is incomplete. This will cause authentication errors.",
  );
}

console.log("Supabase URL:", SUPABASE_URL); // Debug log
