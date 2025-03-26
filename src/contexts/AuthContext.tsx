import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, refreshSession, isSessionValid } from '@/integrations/supabase/client'; // Ensure this path is correct
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast'; // Ensure this path is correct
import { Button } from '@/components/ui/button'; // Ensure this path is correct

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // Indicates loading state for any auth operation
  error: Error | null; // Stores the last auth error
  needsProfileCompletion: boolean; // True if user (e.g., new Google user) needs to provide username
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  resetPassword: (password: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  completeGoogleSignUp: (username: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  clearAuthStorage: () => boolean;
  refreshUserSession: () => Promise<boolean>;
  checkSessionStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_PREFIX = 'slumber-synthesizer-'; // Consistent prefix
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start loading initially
  const [error, setError] = useState<Error | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const { toast } = useToast();

  const refreshAttemptRef = useRef(0);
  const refreshIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true); // Track mount status for async operations

  // Improved error logging
  const logAuthError = useCallback((context: string, error: unknown, showToast = true) => {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[AuthContext ${context}]:`, err?.message, err);
    setError(err); // Set the error state

    if (showToast) {
      toast({
        variant: 'destructive',
        title: `Auth Error (${context})`,
        description: err.message || 'An unexpected error occurred.',
      });
    }
    return err;
  }, [toast]);

  // Clear storage and reset state
  const clearAuthStorage = useCallback(() => {
    try {
      // Clear Supabase specific keys
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase.') || key.startsWith(AUTH_STORAGE_PREFIX)) {
              localStorage.removeItem(key);
          }
      });
      // Reset state if component is still mounted
      if (isMountedRef.current) {
        setUser(null);
        setSession(null);
        setError(null);
        setNeedsProfileCompletion(false);
      }
      console.log("Auth storage cleared and state reset.");
      return true;
    } catch (error) {
      logAuthError('clearAuthStorage', error);
      return false;
    }
  }, [logAuthError]);

  // Check session validity
  const checkSessionStatus = useCallback(async (): Promise<boolean> => {
    try {
      const valid = await isSessionValid();
      if (!valid && user !== null && isMountedRef.current) {
        console.log("Session became invalid, clearing user state.");
        setUser(null); // Clear user if session invalidates
        setSession(null);
      }
      return valid;
    } catch (error) {
      logAuthError('checkSessionStatus', error, false); // Don't toast for background checks
      return false;
    }
  }, [user, logAuthError]);

  // Refresh session
  const refreshUserSession = useCallback(async (): Promise<boolean> => {
    if (refreshAttemptRef.current > 3) {
      console.error("Max session refresh attempts reached. Clearing auth state.");
      clearAuthStorage();
      return false;
    }
    refreshAttemptRef.current += 1;

    try {
      const { data, error } = await refreshSession();
      if (error) throw error;

      if (data?.session && isMountedRef.current) {
        console.log("Session refreshed successfully.");
        setSession(data.session);
        setUser(data.session.user); // Ensure user state is synced
        refreshAttemptRef.current = 0; // Reset counter on success
        return true;
      }
      // If no session after refresh, clear state
      if (!data?.session && isMountedRef.current) {
        console.log("No session returned after refresh attempt.");
        setUser(null);
        setSession(null);
      }
      return false;
    } catch (error) {
      logAuthError('refreshUserSession', error);
      // Consider clearing storage if refresh fails persistently
      if (refreshAttemptRef.current >= 3) {
        clearAuthStorage();
      }
      return false;
    }
  }, [logAuthError, clearAuthStorage]);

  // Ensure profile exists or determine if completion is needed
  const ensureUserProfile = useCallback(async (currentUser: User): Promise<boolean> => {
    if (!currentUser) return false; // Should not happen if called correctly

    try {
      // 1. Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id') // Only need ID to check existence
        .eq('id', currentUser.id)
        .maybeSingle();

      if (fetchError) {
        logAuthError('ensureUserProfile:fetch', fetchError);
        return false; // Uncertain state due to error
      }

      if (existingProfile) {
        console.log('Profile check: Profile exists for user:', currentUser.id);
        return true; // Profile exists, we're good
      }

      // 2. Profile doesn't exist. Check provider and metadata.
      const provider = currentUser.app_metadata?.provider;
      const metadataUsername = currentUser.user_metadata?.username;

      if (provider === 'google' && !metadataUsername) {
        console.log('Profile check: New Google user requires username completion.');
        return false; // Defer profile creation, signal completion needed
      }

      // 3. Proceed to create profile (non-Google or Google with metadata - though unlikely)
      const userEmail = currentUser.email || '';
      // Use metadata username if available, otherwise generate fallback
      const username = metadataUsername || userEmail.split('@')[0] + Math.random().toString(36).substring(2, 6); // Add random suffix to fallback
      const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
      const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '';

      if (!username || username.trim() === '') {
        logAuthError('ensureUserProfile:create', new Error('Cannot create profile: calculated username is empty.'));
        return false;
      }

      console.log('Profile check: Attempting to create profile for user:', currentUser.id, 'with username:', username);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: currentUser.id,
          username: username.trim(),
          full_name: fullName,
          email: userEmail, // Store email in profile for convenience? Check privacy implications.
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), // Set updated_at on creation
        }]);

      if (insertError) {
        // Handle specific common errors
        if (insertError.code === '23505' && insertError.message.includes('profiles_username_key')) {
          logAuthError('ensureUserProfile:insert', new Error(`Username "${username}" is already taken.`), false); // Don't toast here, let caller handle
          // This case might occur if the fallback username generation collides. Rare.
          // Or if a Google user somehow had metadata username that was already taken.
          // We might need to prompt for a username even in this edge case. For now, just fail creation.
          return false;
        }
        logAuthError('ensureUserProfile:insert', insertError);
        return false; // Profile creation failed
      }

      console.log('Profile check: Profile created successfully for user:', currentUser.id);
      return true; // Profile created

    } catch (err) {
      logAuthError('ensureUserProfile:general', err);
      return false;
    }
  }, [logAuthError, supabase]); // Assuming supabase client is stable

  // Background Session Check Interval
  useEffect(() => {
    const setupSessionCheck = () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (user) { // Only run interval if logged in
        refreshIntervalRef.current = window.setInterval(async () => {
          console.log("Periodic session check running...");
          await checkSessionStatus();
        }, SESSION_CHECK_INTERVAL);
      }
    };
    setupSessionCheck();
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [user, checkSessionStatus]); // Re-run if user or checkSessionStatus changes

  // Main Initialization and Auth State Change Listener Effect
  useEffect(() => {
    isMountedRef.current = true;
    let authListener: { unsubscribe: () => void } | null = null;
    setLoading(true); // Start loading on mount

    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error: sessionError }) => {
      if (!isMountedRef.current) return; // Bail if unmounted during async op

      if (sessionError) {
        logAuthError('initialGetSession', sessionError);
      }

      if (initialSession?.user) {
        console.log("Initial load: Session found for user:", initialSession.user.id);
        setUser(initialSession.user);
        setSession(initialSession);
        setNeedsProfileCompletion(false); // Assume complete initially

        // Check profile status on load
        const profileExists = await ensureUserProfile(initialSession.user);
        if (!profileExists && initialSession.user.app_metadata?.provider === 'google') {
            // Double check profile REALLY doesn't exist
             const { data: checkProfileAgain, error: checkError } = await supabase.from('profiles').select('id').eq('id', initialSession.user.id).maybeSingle();
             if (checkError) { logAuthError('initialProfileCheck', checkError, false); }
             else if (!checkProfileAgain) {
                console.log("Initial load: Determined Google user needs profile completion.");
                if (isMountedRef.current) setNeedsProfileCompletion(true);
             }
        }
      } else {
        console.log("Initial load: No active session.");
        setUser(null);
        setSession(null);
        setNeedsProfileCompletion(false);
      }

      // Regardless of initial session, set up the listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!isMountedRef.current) return; // Check mount status in listener callback
        console.log(`onAuthStateChange: Event = ${event}, User = ${currentSession?.user?.id ?? 'null'}`);

        switch (event) {
          case 'SIGNED_IN':
            if (currentSession?.user) {
              setUser(currentSession.user);
              setSession(currentSession);
              setNeedsProfileCompletion(false); // Reset on sign-in

              const profileEnsured = await ensureUserProfile(currentSession.user);
              if (!profileEnsured && currentSession.user.app_metadata?.provider === 'google') {
                  // Double check profile REALLY doesn't exist
                  const { data: checkProfileAgain, error: checkError } = await supabase.from('profiles').select('id').eq('id', currentSession.user.id).maybeSingle();
                  if (checkError) { logAuthError('signedInProfileCheck', checkError, false); }
                  else if (!checkProfileAgain) {
                      console.log("SIGNED_IN: Determined Google user needs profile completion.");
                      if (isMountedRef.current) setNeedsProfileCompletion(true);
                  } else {
                      console.log("SIGNED_IN: Google user profile found unexpectedly after ensureUserProfile returned false.");
                  }
              }
            } else {
               console.warn("SIGNED_IN event without session user data.");
               // Clear state just in case
               setUser(null); setSession(null); setNeedsProfileCompletion(false);
            }
            break;
          case 'SIGNED_OUT':
            setUser(null);
            setSession(null);
            setNeedsProfileCompletion(false);
            // Optional: Clear other app state related to the user
            break;
          case 'TOKEN_REFRESHED':
            if (currentSession) {
              setSession(currentSession);
              // Only update user if it's different to avoid unnecessary re-renders
              if (currentSession.user && currentSession.user.id !== user?.id) {
                  setUser(currentSession.user);
              }
            } else {
              // If token refresh fails and results in no session, treat as sign out
              setUser(null); setSession(null); setNeedsProfileCompletion(false);
            }
            break;
           case 'USER_UPDATED':
               if (currentSession?.user) {
                   setUser(currentSession.user); // Update user data if metadata changes etc.
               }
               break;
          case 'PASSWORD_RECOVERY':
              // Usually handled by navigating to a reset page based on URL hash
              console.log("Password recovery flow initiated.");
              break;
          default:
            console.log(`Unhandled auth event: ${event}`);
        }
        // Always finish loading after the first event or initial check completes
        setLoading(false);
      });
      authListener = subscription;

      // Finish initial loading state if no session was found initially and listener is set up
      if (!initialSession) {
          setLoading(false);
      }

    }).catch(err => {
      if (isMountedRef.current) {
        logAuthError('initialAuthSetup', err);
        setLoading(false); // Ensure loading stops on error
      }
    });

    // Cleanup function
    return () => {
      console.log("AuthContext unmounting. Cleaning up listener.");
      isMountedRef.current = false;
      authListener?.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [ensureUserProfile, logAuthError, supabase]); // Add dependencies

  // --- Auth Action Implementations ---

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.session || !data.user) throw new Error("Sign in successful but no session/user returned.");

      // State will be updated by onAuthStateChange, but we can show success toast immediately
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: logAuthError('signIn', error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check if username is available before attempting sign up
       const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

        if (usernameCheckError) throw new Error(`Username check failed: ${usernameCheckError.message}`);
        if (existingUsername) throw new Error('Username is already taken.');


      // 2. Sign up the user with metadata
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(), // Store username in metadata
            full_name: fullName,
          },
          // emailRedirectTo: `${window.location.origin}/confirm-email` // Optional: Add email confirmation
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Sign up successful but no user data returned.");

      // 3. Immediately create the profile (onAuthStateChange might race)
      // Use the confirmed available username
      /*
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          username: username.trim(),
          full_name: fullName,
          // email: email, // <--- REMOVE THIS LINE
          // avatar_url: '', // Default avatar or leave null?
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        // Log profile error, but user is already created in auth. Might need manual cleanup or retry logic.
        logAuthError('signUp:profileInsert', profileError, false); // Don't toast immediately, main toast below
        // Make the error message slightly more specific if possible
         const detailedError = new Error(`Account created, but profile setup failed: ${profileError.message}. Please contact support or try logging in.`);
         // Attach original error details if helpful
         (detailedError as any).cause = profileError;
         throw detailedError;
      }
      */

      // State update will be handled by onAuthStateChange ('SIGNED_IN' usually follows sign up)
      toast({
        title: 'Account Created!',
        description: 'Please check your email for verification if required, then sign in.', // Modify if not using email verification
      });
      return { success: true, error: null };
    } catch (error) {
      // The logAuthError function already handles displaying the toast
      return { success: false, error: logAuthError('signUp', error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      // State cleared by onAuthStateChange
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
    } catch (error) {
      logAuthError('signOut', error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      // Clear previous URL errors just in case
      const url = new URL(window.location.href);
      url.search = ''; url.hash = '';
      window.history.replaceState({}, '', url.toString());

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`, // Redirect back to Auth page
          // queryParams: { access_type: 'offline', prompt: 'consent' } // Add if needed
        },
      });
      if (oauthError) throw oauthError;
      // Redirect happens automatically, no need to do anything else here
      // setLoading will remain true until the redirect happens or an error occurs
    } catch (error) {
      logAuthError('signInWithGoogle', error);
      if (isMountedRef.current) setLoading(false); // Stop loading on error before redirect
    }
    // No finally setLoading(false) here, as redirect should occur on success
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`, // Your password reset page
      });
      if (resetError) throw resetError;
      toast({ title: 'Check Your Email', description: 'Password reset instructions sent.' });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: logAuthError('forgotPassword', error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const resetPassword = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Supabase client handles the access token from the URL hash automatically
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast({ title: 'Password Updated', description: 'You can now sign in with your new password.' });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: logAuthError('resetPassword', error) };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const completeGoogleSignUp = async (username: string) => {
    setLoading(true);
    setError(null);
    const currentUser = user; // Capture user state at start

    if (!currentUser) {
      setLoading(false);
      return { success: false, error: logAuthError('completeGoogleSignUp', new Error('User session not found.')) };
    }
     if (!username || username.trim() === '') {
      setLoading(false);
      return { success: false, error: logAuthError('completeGoogleSignUp', new Error('Username cannot be empty.')) };
    }

    try {
      // 1. Check Username Availability
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .neq('id', currentUser.id) // Exclude self
        .maybeSingle();

      if (usernameCheckError) throw new Error(`Username check failed: ${usernameCheckError.message}`);
      if (existingUsername) throw new Error('Username is already taken.');

      // 2. Check if profile exists (shouldn't, but check again)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileCheckError) throw profileCheckError;

      if (existingProfile) {
        console.warn('completeGoogleSignUp: Profile found unexpectedly for user:', currentUser.id);
        // Attempt to update the existing profile's username just in case
         const { error: updateExistingError } = await supabase
            .from('profiles')
            .update({ username: username.trim(), updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
         if (updateExistingError) { logAuthError('completeGoogleSignUp:updateExisting', updateExistingError); /* Non-fatal? */ }

      } else {
        // 3. Update Auth Metadata FIRST
        const { error: updateMetaError } = await supabase.auth.updateUser({
          data: {
            username: username.trim(),
            // Preserve/update other relevant metadata if needed
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
            avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || ''
          }
        });
        // Log error but maybe continue to profile creation attempt?
        if (updateMetaError) { logAuthError('completeGoogleSignUp:updateMeta', updateMetaError, false); }
        else { console.log("Auth metadata updated successfully with username."); }


        // 4. Create Profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            username: username.trim(),
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
            email: currentUser.email || '',
            avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          // If profile insert fails after metadata update, it's a problem.
          throw new Error(`Failed to create profile: ${insertError.message}`);
        }
         console.log("Profile created successfully.");
      }

      // --- Success ---
      if (isMountedRef.current) setNeedsProfileCompletion(false); // Update state

      // Clear URL junk
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = ''; cleanUrl.hash = '';
      window.history.replaceState({}, '', cleanUrl.toString());

       // Refresh user state to get updated metadata reflected immediately
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.user && isMountedRef.current) {
          setUser(refreshed.user);
      }


      toast({ title: 'Account Setup Complete!', description: 'Welcome!' });
      return { success: true, error: null };

    } catch (error) {
      // Error occurred
      return { success: false, error: logAuthError('completeGoogleSignUp', error) };
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
    refreshUserSession,
    checkSessionStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
