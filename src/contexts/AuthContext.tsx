import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSessionValid, refreshSession, isValidSupabaseConfig } from '@/integrations/supabase/client'; // Use the existing client
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // True during initial load or async auth actions
  error: Error | null;
  needsProfileCompletion: boolean; // Added from previous fixes
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  resetPassword: (password: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  completeGoogleSignUp: (username: string) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  clearAuthStorage: () => boolean;
  refreshSession: () => Promise<{ success: boolean; error: AuthError | Error | null }>;
  // Removed refreshUserSession and checkSessionStatus as they are less needed with simpler logic
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_PREFIX = 'slumber-synthesizer-';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start loading
  const [error, setError] = useState<Error | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const { toast } = useToast();
  const isMountedRef = useRef(true); // Track mount status

  // --- Utility Functions --- (Include logAuthError, clearAuthStorage from previous version)
  const logAuthError = useCallback((context: string, error: unknown, showToast = true) => {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[AuthContext ${context}]:`, err?.message, err);
    setError(err);
    if (showToast) {
      toast({ variant: 'destructive', title: `Auth Error (${context})`, description: err.message || 'An unexpected error occurred.' });
    }
    return err;
  }, [toast]);

  const clearAuthStorage = useCallback(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase.') || key.startsWith(AUTH_STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      if (isMountedRef.current) {
        setUser(null); setSession(null); setError(null); setNeedsProfileCompletion(false);
      }
      console.log("Auth storage cleared.");
      return true;
    } catch (error) {
      logAuthError('clearAuthStorage', error);
      return false;
    }
  }, [logAuthError]);
  
  // Add the refreshSession implementation
  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logAuthError('refreshSession', error, false);
        return { success: false, error };
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      
      return { success: !!data.session, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error refreshing session');
      logAuthError('refreshSession', error, false);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // --- Profile Check Logic --- (Include ensureUserProfile from previous version)
 const ensureUserProfile = useCallback(async (currentUser: User): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (fetchError) {
        logAuthError('ensureUserProfile:fetch', fetchError, false); // Don't toast bg checks
        return false;
      }

      if (existingProfile) {
        console.log('Profile check: Profile exists for user:', currentUser.id);
        return true;
      }

      const provider = currentUser.app_metadata?.provider;
      const metadataUsername = currentUser.user_metadata?.username;

      // If Google user lacks username in metadata, defer creation
      if (provider === 'google' && !metadataUsername) {
        console.log('Profile check: New Google user requires username completion.');
        return false; // Signal completion needed
      }

      // Proceed to create profile if necessary (e.g., for email signup, or Google if somehow missed)
      const userEmail = currentUser.email || '';
      const username = metadataUsername || userEmail.split('@')[0] + Math.random().toString(36).substring(2, 6);
      const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
      const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '';

      if (!username || username.trim() === '') {
        logAuthError('ensureUserProfile:create', new Error('Cannot create profile: calculated username is empty.'), false);
        return false;
      }

      console.log('Profile check: Attempting to create profile for user:', currentUser.id, 'with username:', username);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: currentUser.id,
          username: username.trim(),
          full_name: fullName,
          // email: userEmail, // Removed based on previous fix
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (insertError) {
         // Handle specific common errors like unique username violation if needed
         if (insertError.code === '23505' && insertError.message.includes('profiles_username_key')) {
           logAuthError('ensureUserProfile:insert', new Error(`Fallback username "${username}" was already taken.`), false);
           return false; // Indicate failure, user might need to provide one
         }
         logAuthError('ensureUserProfile:insert', insertError, false);
         return false; // Profile creation failed
      }

      console.log('Profile check: Profile created successfully for user:', currentUser.id);
      return true; // Profile created

    } catch (err) {
      logAuthError('ensureUserProfile:general', err, false);
      return false;
    }
  }, [logAuthError]); // Assuming supabase is stable, logAuthError is stable via useCallback


  // --- Simplified Initialization and Auth State Listener ---
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true); // Start loading
    let authListener: { unsubscribe: () => void } | null = null;

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error: sessionError }) => {
      if (!isMountedRef.current) return; // Component unmounted? Bail.

      if (sessionError) {
        logAuthError('initialGetSession', sessionError, false); // Log but don't necessarily block UI
      }

      // Update state based on initial check
      if (initialSession?.user) {
        console.log("Initial load: Session found for user:", initialSession.user.id);
        setUser(initialSession.user);
        setSession(initialSession);
        setNeedsProfileCompletion(false); // Reset

        // Check profile status on load
        const profileExists = await ensureUserProfile(initialSession.user);
         if (!profileExists && initialSession.user.app_metadata?.provider === 'google') {
             const { data: checkProfileAgain } = await supabase.from('profiles').select('id').eq('id', initialSession.user.id).maybeSingle();
             if (!checkProfileAgain && isMountedRef.current) {
                console.log("Initial load: Determined Google user needs profile completion.");
                setNeedsProfileCompletion(true);
             }
         }
      } else {
        console.log("Initial load: No active session.");
        setUser(null);
        setSession(null);
        setNeedsProfileCompletion(false);
      }

       // 2. Set up the Listener (AFTER initial check state is set)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!isMountedRef.current) return; // Check mount status in listener
        console.log(`onAuthStateChange: Event = ${event}, User = ${currentSession?.user?.id ?? 'null'}`);

        switch (event) {
          case 'SIGNED_IN':
            if (currentSession?.user) {
              setUser(currentSession.user);
              setSession(currentSession);
              setNeedsProfileCompletion(false); // Reset on sign-in

              const profileEnsured = await ensureUserProfile(currentSession.user);
              if (!profileEnsured && currentSession.user.app_metadata?.provider === 'google') {
                  const { data: checkProfileAgain } = await supabase.from('profiles').select('id').eq('id', currentSession.user.id).maybeSingle();
                  if (!checkProfileAgain && isMountedRef.current) {
                      console.log("SIGNED_IN: Determined Google user needs profile completion.");
                      setNeedsProfileCompletion(true);
                  }
              }
            } else {
               setUser(null); setSession(null); setNeedsProfileCompletion(false); // Clear if no user
            }
            // We are now definitely finished with any post-sign-in logic
            if (isMountedRef.current) setLoading(false);
            break;

          case 'SIGNED_OUT':
            setUser(null);
            setSession(null);
            setNeedsProfileCompletion(false);
            if (isMountedRef.current) setLoading(false); // Also stop loading on sign out
            break;

          case 'TOKEN_REFRESHED':
             // Update session, maybe user if different
            if (currentSession) {
              setSession(currentSession);
              if (currentSession.user && currentSession.user.id !== user?.id) {
                  setUser(currentSession.user);
              }
            } else {
              // Treat failed refresh as sign out
              setUser(null); setSession(null); setNeedsProfileCompletion(false);
              if (isMountedRef.current) setLoading(false);
            }
            // Don't change loading state for background refresh
            break;

           case 'USER_UPDATED':
               if (currentSession?.user) setUser(currentSession.user);
               // Don't change loading state
               break;
           case 'PASSWORD_RECOVERY':
                // Usually handled by UI routing based on URL hash
                if (isMountedRef.current) setLoading(false); // Stop loading if we land here
               break;
          default:
            console.log(`Unhandled auth event: ${event}`);
            // If it's an unknown event, maybe stop loading just in case?
            if (isMountedRef.current) setLoading(false);
        }
      });
      authListener = subscription;

      // 3. Initial loading complete AFTER initial check AND listener setup
      // setLoading(false); // Moved into the listener's SIGNED_IN/SIGNED_OUT etc.

    }).catch(err => {
      // Catch errors during initial getSession promise
      if (isMountedRef.current) {
        logAuthError('initialAuthSetupPromise', err);
        setLoading(false); // Ensure loading stops on error
      }
    });

    // Cleanup function
    return () => {
      console.log("AuthContext unmounting. Cleaning up listener.");
      isMountedRef.current = false;
      authListener?.unsubscribe();
    };
  }, [ensureUserProfile, logAuthError]); // Rerun if these stable functions change (they shouldn't)


  // --- Auth Action Implementations (Simplified) ---

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Let Supabase handle the sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // SUCCESS: onAuthStateChange will handle setting user/session and setLoading(false)
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      return { success: true, error: null };

    } catch (error) {
        // FAILURE: Log error, set loading false
        const loggedError = logAuthError('signIn', error);
        if (isMountedRef.current) setLoading(false); // Ensure loading stops on error path
        return { success: false, error: loggedError };
    }
    // No finally block needed as success path relies on listener to stop loading
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    setLoading(true);
    setError(null);
    try {
        // Check username availability
        const { data: existingUsername, error: usernameCheckError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username.trim())
            .maybeSingle();
        if (usernameCheckError) throw new Error(`Username check failed: ${usernameCheckError.message}`);
        if (existingUsername) throw new Error('Username is already taken.');

        // Sign up user
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username.trim(), full_name: fullName } }
        });
        if (signUpError) throw signUpError;

        // SUCCESS: onAuthStateChange will handle profile creation via ensureUserProfile and setLoading(false)
        toast({ title: 'Account Created!', description: 'Please check your email for verification if required.' });
        return { success: true, error: null };

    } catch (error) {
        // FAILURE: Log error, set loading false
        const loggedError = logAuthError('signUp', error);
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
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      // Manually clear state in case the event doesn't fire
      if (isMountedRef.current) {
        setUser(null);
        setSession(null);
        setNeedsProfileCompletion(false);
        setLoading(false);
      }
      
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
    } catch (error) {
      logAuthError('signOut', error);
      if (isMountedRef.current) setLoading(false);
    }
  };
  const signInWithGoogle = async () => {
    // No need to set loading here, redirect happens or error occurs
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (oauthError) throw oauthError;
      // Redirect initiated by Supabase...
    } catch (error) {
      logAuthError('signInWithGoogle', error);
      // Stop loading ONLY if an error prevented redirect
      if (isMountedRef.current && loading) setLoading(false);
    }
  };

    // --- Other actions (forgotPassword, resetPassword, completeGoogleSignUp) ---
    // Keep these as they were in the previous correct version,
    // ensuring setLoading(true) at start and setLoading(false) in finally.
    // Example for completeGoogleSignUp structure:

  const forgotPassword = async (email: string) => {
    setLoading(true); setError(null);
    try {
      // Check if Supabase is properly configured
      if (!isValidSupabaseConfig()) {
        console.error('Supabase client is not properly configured. Missing configuration.');
        throw new Error('Authentication service is not properly configured. Please contact support.');
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
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl,
      });
      
      if (resetError) {
        console.error('Password reset API error:', resetError);
        throw resetError;
      }
      
      // Log success response
      console.log('Password reset response:', data);
      
      toast({ 
        title: 'Check Your Email', 
        description: 'Reset link sent! Click it within 1 hour. Check spam folder if not found in inbox.'
      });
      return { success: true, error: null };
    } catch (error) { 
      console.error('Full password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Password Reset Issue',
        description: error instanceof Error ? error.message : 'We encountered a problem sending the reset email. Please try again or contact support if the issue persists.',
      });
      return { success: false, error: logAuthError('forgotPassword', error) }; 
    } finally { 
      if (isMountedRef.current) setLoading(false); 
    }
  };

  const resetPassword = async (password: string) => {
    setLoading(true); setError(null);
    try {
      // Check if Supabase is properly configured
      if (!isValidSupabaseConfig()) {
        console.error('Supabase client is not properly configured. Missing configuration.');
        throw new Error('Authentication service is not properly configured. Please contact support.');
      }
      
      console.log('Attempting to reset password');
      
      // Get the code from URL if it exists (handle both auth flows)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      
      if (code) {
        console.log('Using auth code flow for password reset with code present');
        
        // With Supabase, we need to exchange the code for a session first
        try {
          console.log('Attempting to exchange code for session...');
          
          // Create a promise with timeout to prevent hanging
          const exchangeWithTimeout = async () => {
            // Set a 10-second timeout for the code exchange
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Code exchange timed out after 10 seconds')), 10000)
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
          const { data: exchangeData, error: codeError } = await exchangeWithTimeout();
          
          if (codeError) {
            console.error('Error exchanging code for session:', codeError);
            
            // Special handling for PKCE verification errors
            if (codeError.message && codeError.message.includes('code challenge does not match')) {
              console.log('Detected PKCE verification error - code has already been used or browser storage was cleared');
              throw new Error('This reset link has already been used or your browser data was cleared. Please request a new password reset link.');
            }
            
            throw codeError;
          }
          
          if (!exchangeData || !exchangeData.session) {
            console.error('Code exchange returned empty data or no session');
            throw new Error('Failed to establish a session with the provided reset code. The code may be invalid or expired.');
          }
          
          console.log('Successfully exchanged code for session, user ID:', 
            exchangeData.session?.user?.id || 'unknown');
            
        } catch (exchangeError) {
          console.error('Exception during code exchange:', exchangeError);
          if (exchangeError instanceof Error && exchangeError.message.includes('timed out')) {
            // Handle timeout specifically
            throw new Error('The password reset request timed out. Please try again or use the troubleshooter for assistance.');
          } else {
            // Handle other errors
            throw new Error(`Failed to process reset code: ${exchangeError instanceof Error ? exchangeError.message : String(exchangeError)}`);
          }
        }
      } else {
        console.log('No code parameter found in URL, checking for existing session');
      }
      
      // Add a small delay to ensure session state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify we have a session token before updating - after code exchange
      console.log('Verifying session after code exchange...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw sessionError;
      }
      
      if (!sessionData?.session) {
        console.error('No active session found for password reset');
        throw new Error('Your password reset session could not be established. Please request a new reset link.');
      }
      
      console.log('Session verified, user ID:', sessionData.session.user.id);
      console.log('Updating password now');
      
      // Force a new request rather than using a potentially stale session
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });
      
      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }
      
      console.log('Password reset successful');
      
      // Force sign out to ensure clean state after password reset
      try {
        console.log('Signing out and clearing auth data after password reset...');
        
        // First, clear local storage for this domain to remove any session data
        clearAuthStorage();
        
        // Then, explicitly sign out from Supabase
        const { error: signOutError } = await supabase.auth.signOut({ 
          scope: 'global' // Sign out from all tabs/windows
        });
        
        if (signOutError) {
          console.error('Error signing out after password reset:', signOutError);
          // Log but continue - the password was updated successfully
        } else {
          console.log('Signed out successfully after password reset');
        }
        
        // Manually clear state in case the event doesn't fire
        if (isMountedRef.current) {
          setUser(null);
          setSession(null);
        }
      } catch (signOutError) {
        console.error('Exception during sign-out after password reset:', signOutError);
        // Continue anyway, as the password was updated successfully
      }
      
      toast({ 
        title: 'Password Updated', 
        description: 'Your password has been successfully reset. You can now sign in with your new password.' 
      });
      
      return { success: true, error: null };
    } catch (error) { 
      console.error('Full password reset error details:', error);
      return { success: false, error: logAuthError('resetPassword', error) }; 
    } finally { 
      if (isMountedRef.current) setLoading(false); 
    }
  };


   const completeGoogleSignUp = async (username: string) => {
     setLoading(true); setError(null);
     const currentUser = user; // Capture user state

     if (!currentUser) { setLoading(false); return { success: false, error: logAuthError('completeGoogleSignUp', new Error('User session not found.'))}; }
     if (!username || username.trim() === '') { setLoading(false); return { success: false, error: logAuthError('completeGoogleSignUp', new Error('Username cannot be empty.'))}; }

     try {
       // 1. Check Username Availability
       const { data: existingUsername, error: usernameCheckError } = await supabase.from('profiles').select('username').eq('username', username.trim()).neq('id', currentUser.id).maybeSingle();
       if (usernameCheckError) throw new Error(`Username check failed: ${usernameCheckError.message}`);
       if (existingUsername) throw new Error('Username is already taken.');

       // 2. Check if profile exists (shouldn't, but check again)
       const { data: existingProfile, error: profileCheckError } = await supabase.from('profiles').select('id').eq('id', currentUser.id).maybeSingle();
       if (profileCheckError) throw profileCheckError;

       if (existingProfile) {
         console.warn('completeGoogleSignUp: Profile found unexpectedly. Updating username.');
         const { error: updateExistingError } = await supabase.from('profiles').update({ username: username.trim(), updated_at: new Date().toISOString() }).eq('id', currentUser.id);
         if (updateExistingError) { logAuthError('completeGoogleSignUp:updateExisting', updateExistingError, false); }
       } else {
         // 3. Update Auth Metadata FIRST
         const { error: updateMetaError } = await supabase.auth.updateUser({ data: { username: username.trim(), full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '', avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '' }});
         if (updateMetaError) { logAuthError('completeGoogleSignUp:updateMeta', updateMetaError, false); }

         // 4. Create Profile
         const { error: insertError } = await supabase.from('profiles').insert({ id: currentUser.id, username: username.trim(), full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '', avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
         if (insertError) throw new Error(`Failed to create profile: ${insertError.message}`);
       }

       // --- Success ---
       if (isMountedRef.current) setNeedsProfileCompletion(false);

       // Refresh user state to get updated metadata
       const { data: refreshed } = await supabase.auth.refreshSession();
       if (refreshed?.user && isMountedRef.current) setUser(refreshed.user);

       toast({ title: 'Account Setup Complete!', description: 'Welcome!' });
       return { success: true, error: null };

     } catch (error) {
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
    refreshSession,
    // Removed refreshUserSession, checkSessionStatus from value
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// --- useAuth Hook --- (Keep as is)
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}