import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  completeGoogleSignUp: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Function to ensure user profile exists
  const ensureUserProfile = async (user: User) => {
    try {
      // First check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking for existing profile:", fetchError);
        return;
      }

      // If profile exists, we're done
      if (existingProfile) {
        console.log("User profile already exists");
        return;
      }

      // For Google auth, we need to check if we have a username
      // If not, we don't try to create a profile yet - the Auth component will handle this
      const metadata = user.user_metadata;
      const provider = metadata?.provider;

      if (provider === "google" && !metadata?.username) {
        console.log(
          "Google auth user without username, skipping profile creation",
        );
        return;
      }

      // Extract user data from metadata
      const userEmail = user.email || "";
      const fullName = metadata?.full_name || metadata?.name || "";
      // For Google users, we'll use the username they provided in the second step
      // For email users, their username comes from the signup form
      const username =
        metadata?.username ||
        metadata?.preferred_username ||
        userEmail.split("@")[0];

      if (!username || username.trim() === "") {
        console.error("Cannot create profile: username is empty");
        return;
      }

      // Create profile if it doesn't exist
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: user.id,
          username,
          full_name: fullName,
          email: userEmail,
          avatar_url: metadata?.avatar_url || metadata?.picture || "",
        },
      ]);

      if (insertError) {
        console.error("Error creating user profile:", insertError);
        toast({
          variant: "destructive",
          title: "Profile Creation Error",
          description: "There was an error creating your profile.",
        });
      } else {
        console.log("Created new user profile");
      }
    } catch (err) {
      console.error("Error in ensureUserProfile:", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const timeoutId = setTimeout(() => {
          console.error("Auth initialization timeout reached");
          setLoading(false);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description:
              "Failed to initialize authentication. Please refresh the page.",
          });
        }, 10000);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          setSession(session);
          setUser(session.user);

          // Ensure profile exists for the authenticated user
          await ensureUserProfile(session.user);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          setSession(session);
          setUser(session?.user || null);

          // If there's a user in the session, ensure they have a profile
          if (session?.user) {
            await ensureUserProfile(session.user);
          }
        });

        clearTimeout(timeoutId);
        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        setError(
          error instanceof Error ? error : new Error("Unknown auth error"),
        );
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to initialize authentication",
        });
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description:
          error instanceof Error ? error.message : "Failed to sign in",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => {
    try {
      setLoading(true);

      // Validate username is not empty (this is required by the database)
      if (!username || username.trim() === "") {
        throw new Error("Username cannot be empty");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile record after successful signup
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            username, // Ensure username is included
            full_name: fullName,
            email,
          },
        ]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }
      }

      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
      });
    } catch (error) {
      console.error("Sign up error:", error);
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description:
          error instanceof Error ? error.message : "Failed to create account",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description:
          error instanceof Error ? error.message : "Failed to sign out",
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth",
          queryParams: {
            // Ensure the auth flow includes enough privileges
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Google authentication initiated",
        description: "You'll be redirected to Google for authentication.",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to sign in with Google",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // This function is from the dreamwall branch
  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send password reset email",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // This function is from the dreamwall branch
  const resetPassword = async (password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully reset.",
      });
    } catch (error) {
      console.error("Password update error:", error);
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update password",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // This function is from the main branch
  const completeGoogleSignUp = async (username: string) => {
    try {
      setLoading(true);

      if (!username || username.trim() === "") {
        throw new Error("Username cannot be empty");
      }

      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user found");

      // Update user metadata to include the username
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          provider: "google", // Mark that this is a Google auth user
        },
      });

      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        throw updateError;
      }

      // Create or update the profile with the provided username
      const { error: profileError } = await supabase.from("profiles").upsert([
        {
          id: user.id,
          username: username.trim(),
          full_name: user.user_metadata?.name || "",
          email: user.email || "",
          avatar_url:
            user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        },
      ]);

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Force refresh the session to update user info
      await supabase.auth.refreshSession();

      // Redirect to the journal page after completion
      window.location.href = "/journal";

      toast({
        title: "Account setup complete!",
        description: "Your account has been successfully set up.",
      });
    } catch (error) {
      console.error("Complete Google sign-up error:", error);
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete account setup",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        forgotPassword,
        resetPassword,
        completeGoogleSignUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
