import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  signUp: (email: string, password: string, username: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      setProfile(data as Profile);
      return data as Profile;
    } catch (error) {
      console.error('Error in fetchProfile function:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set explicit timeout to ensure we don't get stuck in loading
        const timeoutId = setTimeout(() => {
          console.log('Auth initialization timeout reached');
          setLoading(false);
        }, 5000); // 5 second timeout as a safety measure
        
        // Get session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        
        if (data.session?.user) {
          setUser(data.session.user);
          setIsVerified(data.session.user.email_confirmed_at != null);
          
          // Fetch profile
          await fetchProfile(data.session.user.id);
        }
        
        clearTimeout(timeoutId);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      // Update loading state
      setLoading(true);
      
      // Update session
      setSession(currentSession);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsVerified(false);
        navigate('/', { replace: true });
      } else if (currentSession?.user) {
        setUser(currentSession.user);
        setIsVerified(currentSession.user.email_confirmed_at != null);
        await fetchProfile(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Sign up function with profile creation
  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      // Check if username already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .limit(1);

      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Username already exists. Please choose another.');
      }

      // Sign up the user
      const { error, data } = await supabase.auth.signUp({
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
      
      // Create profile explicitly (as a fallback in case triggers don't work)
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username,
              full_name: fullName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);
        
        if (profileError) {
          console.warn('Profile creation might have failed:', profileError);
          // We don't throw here as the user might still be created
          // and the profile might be created by a database trigger
        }
      }

      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
    } catch (error) {
      console.error('SignUp error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during sign up",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      
      // Navigate only after sign in is confirmed
      if (data.user) {
        navigate('/journal');
      }
    } catch (error) {
      console.error('SignIn error:', error);
      let errorMessage = "An error occurred during sign in";
      
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please confirm your email before logging in";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Set loading to true to prevent flashing content
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Manually clear state in case the listener doesn't fire immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsVerified(false);
      
      // Navigate to home page
      navigate('/', { replace: true });
      
      setLoading(false);
    } catch (error) {
      console.error('SignOut error:', error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during sign out",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile, 
        session,
        signUp, 
        signIn, 
        signOut, 
        loading,
        isVerified 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
