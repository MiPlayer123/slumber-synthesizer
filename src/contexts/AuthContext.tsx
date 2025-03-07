import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  completeGoogleSignUp: (username: string) => Promise<void>;
  clearAuthStorage: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Function to clear auth storage and reset state
  const clearAuthStorage = () => {
    try {
      // Clear any persisted Supabase auth data from local storage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('supabase.auth.expires_at');
      
      // Clear any app-specific auth storage items if they exist
      localStorage.removeItem('auth-user');
      
      console.log('Auth storage cleared');
      
      // Reset auth state
      setUser(null);
      setSession(null);
      setError(null);
      
      return true;
    } catch (error) {
      console.error('Error clearing auth storage:', error);
      return false;
    }
  };

  // Function to ensure user profile exists
  const ensureUserProfile = async (user: User) => {
    try {
      // First check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing profile:', fetchError);
        return;
      }

      // If profile exists, we're done
      if (existingProfile) {
        console.log('User profile already exists');
        return;
      }

      // For Google auth, we need to check if we have a username
      // If not, we don't try to create a profile yet - the Auth component will handle this
      const metadata = user.user_metadata;
      const provider = metadata?.provider;
      
      if (provider === 'google' && (!metadata?.username)) {
        console.log('Google auth user without username, skipping profile creation');
        return;
      }

      // Extract user data from metadata
      const userEmail = user.email || '';
      const fullName = metadata?.full_name || metadata?.name || '';
      // For Google users, we'll use the username they provided in the second step
      // For email users, their username comes from the signup form
      const username = metadata?.username || metadata?.preferred_username || userEmail.split('@')[0];
      
      if (!username || username.trim() === '') {
        console.error('Cannot create profile: username is empty');
        return;
      }
      
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          username,
          full_name: fullName,
          email: userEmail,
          avatar_url: metadata?.avatar_url || metadata?.picture || ''
        }]);

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        toast({
          variant: 'destructive',
          title: 'Profile Creation Error',
          description: 'There was an error creating your profile.',
        });
      } else {
        console.log('Created new user profile');
      }
    } catch (err) {
      console.error('Error in ensureUserProfile:', err);
    }
  };

  useEffect(() => {
    // Create a reference to store the auth subscription
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    const initializeAuth = async () => {
      // Track retry attempts
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds between retries
      
      // Increase timeout to 20 seconds
      const timeoutId = setTimeout(() => {
        console.error('Auth initialization timeout reached after 20 seconds');
        setLoading(false);
        
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Failed to initialize authentication. Try clearing your auth data or refreshing the page.',
          action: (
            <div className="mt-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  clearAuthStorage();
                  window.location.reload();
                }}
              >
                Clear Auth Data
              </Button>
            </div>
          ),
        });
      }, 20000);

      const attemptInitialization = async (): Promise<void> => {
        try {
          console.log(`Auth initialization attempt ${retryCount + 1}/${maxRetries + 1}`);
          
          // Add timeout to the Supabase call to prevent it from hanging indefinitely
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase getSession timeout')), 8000)
          );
          
          // Race between the actual call and a timeout
          const { data: { session }, error: sessionError } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any;
          
          if (sessionError) {
            throw sessionError;
          }
          
          if (session) {
            console.log('Active session found');
            
            // Important: Update user state only after we have session
            setSession(session);
            setUser(session.user);
            
            // Ensure profile exists for the authenticated user
            await ensureUserProfile(session.user);
          } else {
            console.log('No active session found');
            // Make sure user and session are null if no session found
            setSession(null);
            setUser(null);
          }
          
          // Set up auth state change listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              console.log('Auth state change event:', event);
              console.log('New session:', newSession ? 'Available' : 'None');
              
              // Update state based on the event
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (newSession) {
                  setSession(newSession);
                  setUser(newSession.user);
                  
                  // Ensure profile exists for the user
                  if (newSession.user) {
                    await ensureUserProfile(newSession.user);
                  }
                }
              } else if (event === 'SIGNED_OUT') {
                // Clear user and session state on sign out
                setSession(null);
                setUser(null);
              }
            }
          );
          
          // Store the subscription for cleanup
          authSubscription = subscription;
          
          clearTimeout(timeoutId);
          setLoading(false);
        } catch (error) {
          console.error(`Auth initialization error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
          
          // If we haven't reached max retries, try again
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying authentication in ${retryDelay/1000} seconds...`);
            setTimeout(() => attemptInitialization(), retryDelay);
          } else {
            // Max retries reached, show error
            clearTimeout(timeoutId);
            console.error('Authentication failed after multiple attempts');
            setError(error instanceof Error ? error : new Error('Unknown auth error'));
            setLoading(false);
            
            toast({
              variant: 'destructive',
              title: 'Authentication Error',
              description: 'Failed to connect to authentication service. Please check your network connection and try again.',
              action: (
                <div className="mt-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearAuthStorage();
                      window.location.reload();
                    }}
                  >
                    Clear Auth Data
                  </Button>
                </div>
              ),
            });
          }
        }
      };
      
      // Start the first attempt
      attemptInitialization();
      
      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        // Unsubscribe from auth changes if subscription exists
        if (authSubscription) {
          authSubscription.unsubscribe();
        }
      };
    };

    initializeAuth();
  }, []);

  // Add a custom event type for auth state changes
  type AuthEventType = 'AUTH_SIGN_IN_SUCCESS' | 'AUTH_SIGN_OUT';

  // Function to emit auth events that components can listen for
  const emitAuthEvent = (type: AuthEventType, detail?: any) => {
    console.log(`Emitting auth event: ${type}`);
    const event = new CustomEvent(type, { detail });
    window.dispatchEvent(event);
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Starting sign-in process...');
      setLoading(true);
      
      // Use Promise.race to add a timeout to the sign in call
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in request timed out. Please try again.')), 15000)
      );
      
      // First get the response
      const response = await Promise.race([
        signInPromise,
        timeoutPromise
      ]) as any;
      
      const { data, error } = response;
      console.log('Sign-in response received:', error ? 'Error' : 'Success');
      
      if (error) throw error;
      
      // Verify we have the expected data
      if (!data?.session || !data?.user) {
        console.error('Sign-in succeeded but no user or session returned:', data);
        throw new Error('Authentication succeeded but failed to retrieve user information');
      }
      
      // Explicitly update the authentication state
      console.log('Setting session and user state...');
      setSession(data.session);
      setUser(data.user);
      
      // Force a refresh of the session to ensure it's properly set
      console.log('Refreshing session...');
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh warning:', refreshError);
      } else if (refreshedSession) {
        console.log('Session refreshed successfully');
        setSession(refreshedSession.session);
      }
      
      // Emit auth event to notify components about successful sign-in
      // This will trigger data refetching in components that listen for this event
      emitAuthEvent('AUTH_SIGN_IN_SUCCESS', { user: data.user });
      
      // Wait a moment before showing success message to allow state update
      setTimeout(() => {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
        console.log('Authentication completed successfully');
        
        // Verify user is set properly
        console.log('Auth state after sign-in:', { 
          userSet: !!user, 
          sessionSet: !!session 
        });
      }, 500);
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to sign in';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add specific error detection
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Sign in request timed out. Please check your network connection and try again.';
        } else if (errorMessage.includes('Invalid login')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
      }
      
      // Reset loading state and show error
      setTimeout(() => {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: errorMessage,
        });
      }, 100);
      
      throw error;
    } finally {
      // Add a short delay before resetting loading state to avoid UI flicker
      setTimeout(() => {
        setLoading(false);
        console.log('Sign-in loading state reset');
      }, 300);
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      setLoading(true);
      
      // Validate username is not empty (this is required by the database)
      if (!username || username.trim() === '') {
        throw new Error('Username cannot be empty');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile record after successful signup
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username, // Ensure username is included
              full_name: fullName,
              email
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }
      }

      toast({
        title: 'Account created!',
        description: 'Your account has been successfully created.',
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error instanceof Error ? error.message : 'Failed to create account',
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
      
      // Emit sign out event
      emitAuthEvent('AUTH_SIGN_OUT');
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: error instanceof Error ? error.message : 'Failed to sign out',
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth',
          queryParams: {
            // Ensure the auth flow includes enough privileges
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Google authentication initiated",
        description: "You'll be redirected to Google for authentication.",
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error instanceof Error ? error.message : 'Failed to sign in with Google',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for a password reset link.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to send password reset email',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully reset.',
      });
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        variant: 'destructive',
        title: 'Password Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update password',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to complete Google sign-up with a username
  const completeGoogleSignUp = async (username: string) => {
    try {
      setLoading(true);
      
      if (!username || username.trim() === '') {
        throw new Error('Username cannot be empty');
      }
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');
      
      // Update user metadata to include the username
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          username: username.trim(),
          provider: 'google' // Mark that this is a Google auth user
        }
      });
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        throw updateError;
      }
      
      // Create or update the profile with the provided username
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: user.id,
            username: username.trim(),
            full_name: user.user_metadata?.name || '',
            email: user.email || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
          }
        ]);
      
      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }
      
      // Force refresh the session to update user info
      await supabase.auth.refreshSession();
      
      // Redirect to the journal page after completion
      window.location.href = '/journal';
      
      toast({
        title: 'Account setup complete!',
        description: 'Your account has been successfully set up.',
      });
    } catch (error) {
      console.error('Complete Google sign-up error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error instanceof Error ? error.message : 'Failed to complete account setup',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
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
      clearAuthStorage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
