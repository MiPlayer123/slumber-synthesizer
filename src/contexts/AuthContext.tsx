import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  supabase,
  isSessionValid,
  refreshSession,
  isValidSupabaseConfig,
} from "@/integrations/supabase/client"; // Use the existing client
import { Session, User, AuthError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // True during initial load or async auth actions
  error: Error | null;
  needsProfileCompletion: boolean; // Added from previous fixes
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (
    email: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  resetPassword: (
    password: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  completeGoogleSignUp: (
    username: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  clearAuthStorage: () => boolean;
  // Removed refreshUserSession and checkSessionStatus as they are less needed with simpler logic
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_PREFIX = "slumber-synthesizer-";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start loading
  const [error, setError] = useState<Error | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const { toast } = useToast();
  const isMountedRef = useRef(true); // Track mount status

  // --- Utility Functions --- (Include logAuthError, clearAuthStorage from previous version)
  const logAuthError = useCallback(
    (context: string, error: unknown, showToast = true) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[AuthContext ${context}]:`, err?.message, err);
      setError(err);
      if (showToast) {
        toast({
          variant: "destructive",
          title: `Auth Error (${context})`,
          description: err.message || "An unexpected error occurred.",
        });
      }
      return err;
    },
    [toast],
  );

  const clearAuthStorage = useCallback(() => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("sb-") ||
          key.startsWith("supabase.") ||
          key.startsWith(AUTH_STORAGE_PREFIX)
        ) {
          localStorage.removeItem(key);
        }
      });
      if (isMountedRef.current) {
        setUser(null);
        setSession(null);
        setError(null);
        setNeedsProfileCompletion(false);
      }
      console.log("Auth storage cleared.");
      return true;
    } catch (error) {
      logAuthError("clearAuthStorage", error);
      return false;
    }
  }, [logAuthError]);

  // --- Profile Check Logic --- (Include ensureUserProfile from previous version)
  const ensureUserProfile = useCallback(
    async (currentUser: User): Promise<boolean> => {
      if (!currentUser) {
        console.log("Profile check: No current user provided");
        return false;
      }

      try {
        console.log("Profile check: Checking username for user:", {
          userId: currentUser.id,
          provider: currentUser.app_metadata?.provider,
          metadataUsername: currentUser.user_metadata?.username,
        });

        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Profile check: Error fetching profile:", fetchError);
          return false;
        }

        console.log("Profile check: Username state:", {
          hasUsername: !!existingProfile?.username,
          username: existingProfile?.username,
        });

        // If user has a username in either metadata or profile, they're good
        if (existingProfile?.username || currentUser.user_metadata?.username) {
          console.log("Profile check: User has username");
          if (isMountedRef.current) {
            setNeedsProfileCompletion(false);
          }
          return true;
        }

        // No username found, needs to create one
        console.log("Profile check: User needs to create username");
        if (isMountedRef.current) {
          setNeedsProfileCompletion(true);
        }
        return false;
      } catch (err) {
        console.error("Profile check: Unexpected error:", err);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true); // Start loading
    let authListener: { unsubscribe: () => void } | null = null;
    let isInitialized = false; // Track if we've completed initial setup
    let visibilityTimeout: NodeJS.Timeout | null = null;

    // Initialize the last visibility change timestamp
    (window as any).lastVisibilityChange = Date.now();
    // Track tab visibility state to prevent unnecessary reloads
    (window as any).isReturningToTab = false;

    // Add visibility change listener to handle tab focus changes
    const handleVisibilityChange = () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }

      // Track when the visibility changed
      (window as any).lastVisibilityChange = Date.now();

      if (document.hidden) {
        // Tab is becoming hidden
        (window as any).isReturningToTab = true;
      } else if (!document.hidden && isMountedRef.current && isInitialized) {
        console.log("Tab became visible again");

        // Prevent reloads by disabling Supabase auto-refresh temporarily
        try {
          console.log(
            "Temporarily blocking auto-refresh to prevent reload on tab return",
          );
          // Set a flag to indicate we're handling a tab return
          (window as any).blockNextAuthRefresh = true;

          // Clear the block after a short delay
          setTimeout(() => {
            delete (window as any).blockNextAuthRefresh;
          }, 5000);
        } catch (err) {
          console.error("Error trying to prevent auth refresh:", err);
        }

        // Force the loading state to be false when returning to the tab
        visibilityTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.log("Resetting loading state after visibility change");
            setLoading(false);
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial Session Check
    supabase.auth
      .getSession()
      .then(
        async ({ data: { session: initialSession }, error: sessionError }) => {
          if (!isMountedRef.current) return; // Component unmounted? Bail.

          if (sessionError) {
            logAuthError("initialGetSession", sessionError, false); // Log but don't necessarily block UI
          }

          // Update state based on initial check
          if (initialSession?.user) {
            console.log(
              "Initial load: Session found for user:",
              initialSession.user.id,
            );
            setUser(initialSession.user);
            setSession(initialSession);

            // Check profile status on load
            await ensureUserProfile(initialSession.user);
          } else {
            console.log("Initial load: No active session.");
            setUser(null);
            setSession(null);
            setNeedsProfileCompletion(false);
          }

          setLoading(false);
          isInitialized = true;

          // Set up the Listener (AFTER initial check state is set)
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!isMountedRef.current) return; // Check mount status in listener
            console.log(
              `onAuthStateChange: Event = ${event}, User = ${currentSession?.user?.id ?? "null"}`,
            );

            // Check if this event should be blocked due to tab visibility change
            if (
              (window as any).blockNextAuthRefresh &&
              (event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "INITIAL_SESSION")
            ) {
              console.log(
                `Blocking auth event ${event} triggered by tab visibility change`,
              );
              if (isMountedRef.current) setLoading(false);
              return;
            }

            // Track if this auth event was triggered by visibility change
            const wasTriggeredByVisibilityChange =
              !document.hidden &&
              document.visibilityState === "visible" &&
              (window as any).isReturningToTab &&
              Date.now() - (window as any).lastVisibilityChange < 5000;

            // Skip loading for INITIAL_SESSION events when already initialized
            // unless there's an actual change in token
            const isTokenRefresh =
              event === "INITIAL_SESSION" &&
              isInitialized &&
              (!session ||
                !currentSession ||
                session.access_token !== currentSession.access_token);

            // Don't set loading to true if this event is triggered by tab visibility change
            // or if we have a redundant INITIAL_SESSION
            if (wasTriggeredByVisibilityChange) {
              console.log(
                `Skipping loading state for ${event} triggered by tab visibility change`,
              );
              // Also skip the profile check for visibility-triggered events if we already have the user
              if (user && currentSession?.user?.id === user.id) {
                console.log(
                  "Skipping profile check for returning tab with same user",
                );
                if (isMountedRef.current) setLoading(false);
                return; // Exit early to prevent reloading data
              }
            } else if (event === "INITIAL_SESSION" && isInitialized) {
              console.log(
                "Skipping loading state for redundant INITIAL_SESSION",
              );
            } else if (
              (event !== "INITIAL_SESSION" || isTokenRefresh) &&
              !document.hidden
            ) {
              console.log(`Setting loading to true for auth event: ${event}`);
              setLoading(true);
            }

            try {
              // Wait for a small delay to allow the UI to show loading state
              // This ensures the loading indicator appears before heavy operations
              if (event !== "INITIAL_SESSION" || isTokenRefresh) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }

              switch (event) {
                case "SIGNED_IN":
                  if (currentSession?.user) {
                    // If this is triggered by a tab visibility change and we have the same user,
                    // just maintain the current state and avoid any profile checks or state updates
                    if (
                      wasTriggeredByVisibilityChange &&
                      user &&
                      user.id === currentSession.user.id
                    ) {
                      console.log(
                        "Maintaining current state on tab return with same user - preventing content reload",
                      );
                      // Make sure we explicitly set loading to false since we're skipping the normal flow
                      if (isMountedRef.current && loading) setLoading(false);
                      break; // Exit early without updating state or checking profile
                    }

                    // First set the basic auth state
                    setUser(currentSession.user);
                    setSession(currentSession);

                    // Skip profile check if this is a tab visibility change and we already have user data
                    if (
                      wasTriggeredByVisibilityChange &&
                      user &&
                      user.id === currentSession.user.id
                    ) {
                      console.log(
                        "Skip profile check on tab return for existing user",
                      );
                      break;
                    }

                    // Then check profile status - with a maximum wait time to prevent hanging
                    const profileCheckPromise = ensureUserProfile(
                      currentSession.user,
                    );
                    const timeoutPromise = new Promise<boolean>((resolve) =>
                      setTimeout(() => {
                        console.warn("Profile check timed out, continuing...");
                        resolve(false);
                      }, 3000),
                    );

                    await Promise.race([profileCheckPromise, timeoutPromise]);
                  } else {
                    setUser(null);
                    setSession(null);
                    setNeedsProfileCompletion(false);
                  }
                  break;

                case "SIGNED_OUT":
                  setUser(null);
                  setSession(null);
                  setNeedsProfileCompletion(false);

                  // Force a delay before completing to ensure UI updates
                  await new Promise((resolve) => setTimeout(resolve, 100));

                  // Redirect to auth page if not already there, after signout completes
                  setTimeout(() => {
                    if (window.location.pathname !== "/auth") {
                      console.log("Redirecting to auth page after signout");
                      window.location.href = "/auth";
                    }
                  }, 200);
                  break;

                case "TOKEN_REFRESHED":
                  if (currentSession) {
                    // If triggered by tab visibility change with same user, don't update state
                    if (
                      wasTriggeredByVisibilityChange &&
                      user &&
                      user.id === currentSession.user?.id
                    ) {
                      console.log(
                        "Skipping token refresh handling on tab return",
                      );
                      if (isMountedRef.current && loading) setLoading(false);
                      break;
                    }

                    setSession(currentSession);
                    if (
                      currentSession.user &&
                      currentSession.user.id !== user?.id
                    ) {
                      setUser(currentSession.user);
                      await ensureUserProfile(currentSession.user);
                    }
                  } else {
                    setUser(null);
                    setSession(null);
                    setNeedsProfileCompletion(false);
                  }
                  break;

                case "USER_UPDATED":
                  if (currentSession?.user) {
                    setUser(currentSession.user);
                    await ensureUserProfile(currentSession.user);
                  }
                  break;

                case "PASSWORD_RECOVERY":
                  if (isMountedRef.current) setLoading(false);
                  break;

                case "INITIAL_SESSION":
                  // Only process INITIAL_SESSION if we don't already have a matching session
                  // or if we're in the initial loading phase (!isInitialized)
                  {
                    const shouldProcessInitialSession =
                      !isInitialized ||
                      !session ||
                      !currentSession ||
                      session.access_token !== currentSession.access_token;

                    if (shouldProcessInitialSession) {
                      console.log("Processing INITIAL_SESSION event");
                      if (currentSession?.user) {
                        setUser(currentSession.user);
                        setSession(currentSession);

                        // Only check profile if we actually have a different user or session
                        if (
                          !session ||
                          session.access_token !== currentSession.access_token
                        ) {
                          await ensureUserProfile(currentSession.user);
                        }
                      } else {
                        setUser(null);
                        setSession(null);
                        setNeedsProfileCompletion(false);
                      }
                    } else {
                      console.log("Skipping redundant INITIAL_SESSION event");
                      // Force the loading state to false to prevent getting stuck
                      if (loading && isMountedRef.current) {
                        setLoading(false);
                      }
                    }
                  }
                  break;

                default:
                  console.log(`Unhandled auth event: ${event}`);
                  if (isMountedRef.current) setLoading(false);
              }
            } catch (error) {
              console.error("Error during auth state change:", error);
              logAuthError("authStateChange", error);
            } finally {
              if (isMountedRef.current) {
                setLoading(false); // Always ensure loading is set to false at the end
              }
            }
          });
          authListener = subscription;
        },
      )
      .catch((err) => {
        if (isMountedRef.current) {
          logAuthError("initialAuthSetupPromise", err);
          setLoading(false);
        }
      });

    return () => {
      console.log("AuthContext unmounting. Cleaning up listener.");
      isMountedRef.current = false;
      authListener?.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      // Clear tab state flags
      delete (window as any).isReturningToTab;
      delete (window as any).blockNextAuthRefresh;
    };
  }, [ensureUserProfile, logAuthError]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Let Supabase handle the sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // SUCCESS: onAuthStateChange will handle setting user/session and setLoading(false)
      toast({ title: "Welcome back!", description: "Signed in successfully." });

      // Only redirect if we're on the auth page, no need to reload otherwise
      if (window.location.pathname === "/auth") {
        console.log("Redirecting to home page after signin");
        window.location.href = "/";
      }

      return { success: true, error: null };
    } catch (error) {
      // FAILURE: Log error, set loading false
      const loggedError = logAuthError("signIn", error);
      if (isMountedRef.current) setLoading(false); // Ensure loading stops on error path
      return { success: false, error: loggedError };
    }
    // No finally block needed as success path relies on listener to stop loading
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Check username availability
      const { data: existingUsername, error: usernameCheckError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.trim())
          .maybeSingle();
      if (usernameCheckError)
        throw new Error(`Username check failed: ${usernameCheckError.message}`);
      if (existingUsername) throw new Error("Username is already taken.");

      // Sign up user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim(), full_name: fullName } },
      });
      if (signUpError) throw signUpError;

      // SUCCESS: onAuthStateChange will handle profile creation via ensureUserProfile and setLoading(false)
      toast({
        title: "Account Created!",
        description: "Please check your email for verification if required.",
      });
      return { success: true, error: null };
    } catch (error) {
      // FAILURE: Log error, set loading false
      const loggedError = logAuthError("signUp", error);
      if (isMountedRef.current) setLoading(false);
      return { success: false, error: loggedError };
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      // Clear auth storage first to ensure clean state
      clearAuthStorage();

      // Then sign out from Supabase with a maximum timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
        setTimeout(
          () => reject({ error: new Error("Sign out timed out") }),
          5000,
        ),
      );

      const { error } = await Promise.race([signOutPromise, timeoutPromise]);
      if (error) {
        throw error;
      }

      // Manually clear state in case the event doesn't fire
      if (isMountedRef.current) {
        setUser(null);
        setSession(null);
        setNeedsProfileCompletion(false);

        // Force a small delay before clearing loading to ensure UI updates
        await new Promise((resolve) => setTimeout(resolve, 100));
        setLoading(false);
      }

      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });

      // Force a page reload after a small delay to ensure clean state
      setTimeout(() => {
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
        }
      }, 300);
    } catch (error) {
      logAuthError("signOut", error);
      if (isMountedRef.current) setLoading(false);

      // Force a page reload even on error after a delay
      setTimeout(() => {
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
        }
      }, 300);
    }
  };
  const signInWithGoogle = async () => {
    // No need to set loading here, redirect happens or error occurs
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?signin=google`,
        },
      });
      if (oauthError) throw oauthError;
      // Redirect initiated by Supabase...
    } catch (error) {
      logAuthError("signInWithGoogle", error);
      // Stop loading ONLY if an error prevented redirect
      if (isMountedRef.current && loading) setLoading(false);
    }
  };

  // --- Other actions (forgotPassword, resetPassword, completeGoogleSignUp) ---
  // Keep these as they were in the previous correct version,
  // ensuring setLoading(true) at start and setLoading(false) in finally.
  // Example for completeGoogleSignUp structure:

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      // Check if Supabase is properly configured
      if (!isValidSupabaseConfig()) {
        console.error(
          "Supabase client is not properly configured. Missing configuration.",
        );
        throw new Error(
          "Authentication service is not properly configured. Please contact support.",
        );
      }

      // Log the attempt for debugging
      console.log(`Attempting to send password reset email to: ${email}`);

      // Use window.location.host to capture correct host:port combination
      const baseUrl = `${window.location.protocol}//${window.location.host}`;

      // Set redirectTo directly to the root URL since we're now handling proper redirects in AuthRedirectHandler
      // This ensures we handle the code parameter correctly in the root path handler
      const redirectUrl = baseUrl;
      console.log(`Using redirect URL: ${redirectUrl}`);

      // Add additional options to make the token last longer
      const { data, error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

      if (resetError) {
        console.error("Password reset API error:", resetError);
        throw resetError;
      }

      // Log success response
      console.log("Password reset response:", data);

      toast({
        title: "Check Your Email",
        description:
          "Reset link sent! Click it within 1 hour. Check spam folder if not found in inbox.",
      });
      return { success: true, error: null };
    } catch (error) {
      console.error("Full password reset error:", error);
      toast({
        variant: "destructive",
        title: "Password Reset Issue",
        description:
          error instanceof Error
            ? error.message
            : "We encountered a problem sending the reset email. Please try again or contact support if the issue persists.",
      });
      return { success: false, error: logAuthError("forgotPassword", error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const resetPassword = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Check if Supabase is properly configured
      if (!isValidSupabaseConfig()) {
        console.error(
          "Supabase client is not properly configured. Missing configuration.",
        );
        throw new Error(
          "Authentication service is not properly configured. Please contact support.",
        );
      }

      console.log("Attempting to reset password");

      // Get the code from URL if it exists (handle both auth flows)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        console.log(
          "Using auth code flow for password reset with code present",
        );

        // With Supabase, we need to exchange the code for a session first
        try {
          console.log("Attempting to exchange code for session...");

          // Create a promise with timeout to prevent hanging
          const exchangeWithTimeout = async () => {
            // Set a 10-second timeout for the code exchange
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Code exchange timed out after 10 seconds")),
                10000,
              ),
            );

            // Actual code exchange operation
            const exchangePromise = supabase.auth.exchangeCodeForSession(code);

            // Race the promises - return whichever resolves/rejects first
            return Promise.race([exchangePromise, timeoutPromise]) as Promise<{
              data: { session: Session | null; user: User | null } | null;
              error: AuthError | null;
            }>;
          };

          // Execute the exchange with timeout
          const { data: exchangeData, error: codeError } =
            await exchangeWithTimeout();

          if (codeError) {
            console.error("Error exchanging code for session:", codeError);

            // Special handling for PKCE verification errors
            if (
              codeError.message &&
              codeError.message.includes("code challenge does not match")
            ) {
              console.log(
                "Detected PKCE verification error - code has already been used or browser storage was cleared",
              );
              throw new Error(
                "This reset link has already been used or your browser data was cleared. Please request a new password reset link.",
              );
            }

            throw codeError;
          }

          if (!exchangeData || !exchangeData.session) {
            console.error("Code exchange returned empty data or no session");
            throw new Error(
              "Failed to establish a session with the provided reset code. The code may be invalid or expired.",
            );
          }

          console.log(
            "Successfully exchanged code for session, user ID:",
            exchangeData.session?.user?.id || "unknown",
          );
        } catch (exchangeError) {
          console.error("Exception during code exchange:", exchangeError);
          if (
            exchangeError instanceof Error &&
            exchangeError.message.includes("timed out")
          ) {
            // Handle timeout specifically
            throw new Error(
              "The password reset request timed out. Please try again or use the troubleshooter for assistance.",
            );
          } else {
            // Handle other errors
            throw new Error(
              `Failed to process reset code: ${exchangeError instanceof Error ? exchangeError.message : String(exchangeError)}`,
            );
          }
        }
      } else {
        console.log(
          "No code parameter found in URL, checking for existing session",
        );
      }

      // Add a small delay to ensure session state is updated
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify we have a session token before updating - after code exchange
      console.log("Verifying session after code exchange...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        throw sessionError;
      }

      if (!sessionData?.session) {
        console.error("No active session found for password reset");
        throw new Error(
          "Your password reset session could not be established. Please request a new reset link.",
        );
      }

      console.log("Session verified, user ID:", sessionData.session.user.id);
      console.log("Updating password now");

      // Force a new request rather than using a potentially stale session
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        throw updateError;
      }

      console.log("Password reset successful");

      // Force sign out to ensure clean state after password reset
      try {
        console.log(
          "Signing out and clearing auth data after password reset...",
        );

        // First, clear local storage for this domain to remove any session data
        clearAuthStorage();

        // Then, explicitly sign out from Supabase
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "global", // Sign out from all tabs/windows
        });

        if (signOutError) {
          console.error(
            "Error signing out after password reset:",
            signOutError,
          );
          // Log but continue - the password was updated successfully
        } else {
          console.log("Signed out successfully after password reset");
        }

        // Manually clear state in case the event doesn't fire
        if (isMountedRef.current) {
          setUser(null);
          setSession(null);
        }
      } catch (signOutError) {
        console.error(
          "Exception during sign-out after password reset:",
          signOutError,
        );
        // Continue anyway, as the password was updated successfully
      }

      toast({
        title: "Password Updated",
        description:
          "Your password has been successfully reset. You can now sign in with your new password.",
      });

      return { success: true, error: null };
    } catch (error) {
      console.error("Full password reset error details:", error);
      return { success: false, error: logAuthError("resetPassword", error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const completeGoogleSignUp = async (username: string) => {
    setLoading(true);
    setError(null);
    const currentUser = user; // Capture user state

    if (!currentUser) {
      setLoading(false);
      return {
        success: false,
        error: logAuthError(
          "completeGoogleSignUp",
          new Error("User session not found."),
        ),
      };
    }
    if (!username || username.trim() === "") {
      setLoading(false);
      return {
        success: false,
        error: logAuthError(
          "completeGoogleSignUp",
          new Error("Username cannot be empty."),
        ),
      };
    }

    try {
      // 1. Check Username Availability
      const { data: existingUsername, error: usernameCheckError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.trim())
          .neq("id", currentUser.id)
          .maybeSingle();
      if (usernameCheckError)
        throw new Error(`Username check failed: ${usernameCheckError.message}`);
      if (existingUsername) throw new Error("Username is already taken.");

      // 2. Check if profile exists (shouldn't, but check again)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (profileCheckError) throw profileCheckError;

      if (existingProfile) {
        console.warn(
          "completeGoogleSignUp: Profile found unexpectedly. Updating username.",
        );
        const { error: updateExistingError } = await supabase
          .from("profiles")
          .update({
            username: username.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);
        if (updateExistingError)
          logAuthError(
            "completeGoogleSignUp:updateExisting",
            updateExistingError,
            false,
          );
      } else {
        // 3. Update Auth Metadata FIRST
        const { error: updateMetaError } = await supabase.auth.updateUser({
          data: {
            username: username.trim(),
            full_name:
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              "",
            avatar_url:
              currentUser.user_metadata?.avatar_url ||
              currentUser.user_metadata?.picture ||
              "",
          },
        });
        if (updateMetaError)
          logAuthError(
            "completeGoogleSignUp:updateMeta",
            updateMetaError,
            false,
          );

        // 4. Create Profile
        const { error: insertError } = await supabase.from("profiles").insert({
          id: currentUser.id,
          username: username.trim(),
          full_name:
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            "",
          avatar_url:
            currentUser.user_metadata?.avatar_url ||
            currentUser.user_metadata?.picture ||
            "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (insertError)
          throw new Error(`Failed to create profile: ${insertError.message}`);
      }

      // --- Success ---
      if (isMountedRef.current) setNeedsProfileCompletion(false);

      // Show success toast
      toast({ title: "Account Setup Complete!", description: "Welcome!" });

      // Force a complete page reload BEFORE token refresh
      console.log(
        "Username creation complete, forcing page reload before token refresh...",
      );

      // Use window.location.reload() to force a complete page reload
      window.location.reload();

      // The code below will not execute due to the page reload
      // But we'll keep it for completeness
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.user && isMountedRef.current) setUser(refreshed.user);

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: logAuthError("completeGoogleSignUp", error),
      };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  // --- Provide Context Value ---
  const value = {
    user,
    session,
    loading,
    error,
    needsProfileCompletion,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    forgotPassword,
    resetPassword,
    completeGoogleSignUp,
    clearAuthStorage,
    // Removed refreshUserSession, checkSessionStatus from value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- useAuth Hook --- (Keep as is)
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
