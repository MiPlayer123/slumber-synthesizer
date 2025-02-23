
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  signUp: (email: string, password: string, username: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (mounted) {
              setProfile(data);
              setLoading(false);
            }
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (mounted) {
          setProfile(data);
          if (event === 'SIGNED_IN') {
            navigate('/journal');
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          navigate('/', { replace: true });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
        emailRedirectTo: window.location.origin + '/auth',
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }

    toast({
      title: "Success!",
      description: "Please check your email to confirm your account.",
    });
    
    navigate('/auth');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }

    toast({
      title: "Welcome back!",
      description: "You've successfully signed in.",
    });
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage
      localStorage.clear();
      
      // Reset state
      setUser(null);
      setProfile(null);
      
      // Navigate to home
      navigate('/', { replace: true });
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear session even if error
      localStorage.clear();
      setUser(null);
      setProfile(null);
      navigate('/', { replace: true });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an issue signing out, but you have been logged out.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signOut, loading }}>
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
