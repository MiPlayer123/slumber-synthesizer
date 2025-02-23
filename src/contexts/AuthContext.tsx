
import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const authInitialized = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      console.log('🔄 [Profile] Fetching profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      console.log('✅ [Profile] Fetched:', data?.username);
      setProfile(data);
    } catch (error) {
      console.error('❌ [Profile] Fetch error:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!mounted || authInitialized.current) return;

      console.log('🔄 [Auth] Starting initialization');
      setAuthLoading(true);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user && mounted) {
          console.log('✅ [Auth] Found session for:', session.user.email);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('ℹ️ [Auth] No session found');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ [Auth] Init error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) {
          authInitialized.current = true;
          setAuthLoading(false);
          console.log('✅ [Auth] Initialization complete');
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔔 [Auth] State change:', event, session?.user?.email);

      try {
        switch (event) {
          case 'SIGNED_IN': {
            if (!session?.user) return;
            setUser(session.user);
            await fetchProfile(session.user.id);
            navigate('/journal');
            break;
          }
          case 'SIGNED_OUT': {
            setUser(null);
            setProfile(null);
            navigate('/', { replace: true });
            break;
          }
          case 'TOKEN_REFRESHED': {
            if (!session?.user) return;
            setUser(session.user);
            await fetchProfile(session.user.id);
            break;
          }
        }
      } catch (error) {
        console.error('❌ [Auth] State change error:', error);
      }
    });

    return () => {
      console.log('🧹 [Auth] Cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, full_name: fullName },
          emailRedirectTo: window.location.origin + '/auth',
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
      
      navigate('/auth');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Sign up failed",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Sign in failed",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('❌ [Auth] Sign out error:', error);
      throw error;
    }
  };

  // Compute overall loading state
  const loading = authLoading || profileLoading;

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
