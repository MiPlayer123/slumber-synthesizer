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
    let skipNextAuthChange = false;

    // Initialize auth state from stored session
    const initializeAuth = async () => {
      try {
        console.log('🔄 [Auth] Starting auth initialization...');
        setLoading(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [Auth] Session retrieval error:', error);
          throw error;
        }
        
        if (session?.user && mounted) {
          console.log('✅ [Auth] Found existing session for:', session.user.email);
          skipNextAuthChange = true; // Skip the next auth change event
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('ℹ️ [Auth] No existing session found');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ [Auth] Initialization error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) {
          console.log('✅ [Auth] Initialization complete');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [Auth] Auth state changed:', event, session?.user?.email);
      
      if (!mounted) {
        console.log('⚠️ [Auth] Component unmounted, skipping auth change');
        return;
      }

      if (skipNextAuthChange) {
        console.log('⏭️ [Auth] Skipping auth change due to initialization');
        skipNextAuthChange = false;
        return;
      }

      if (event === 'SIGNED_IN') {
        console.log('🔐 [Auth] Processing SIGNED_IN event');
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          navigate('/journal');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔒 [Auth] Processing SIGNED_OUT event');
        setUser(null);
        setProfile(null);
        navigate('/', { replace: true });
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [Auth] Processing TOKEN_REFRESHED event');
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      }
    });

    return () => {
      console.log('🧹 [Auth] Cleaning up auth subscriptions');
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔄 [Profile] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [Profile] Fetch error:', error);
        throw error;
      }
      
      console.log('✅ [Profile] Fetched successfully:', data?.username);
      setProfile(data);
    } catch (error) {
      console.error('❌ [Profile] Error in fetchProfile:', error);
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
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
        description: error instanceof Error ? error.message : "An error occurred during sign up",
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
        description: error instanceof Error ? error.message : "An error occurred during sign in",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 [Auth] Starting sign out process');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      
      console.log('✅ [Auth] Signed out successfully');
    } catch (error) {
      console.error('❌ [Auth] Error in signOut:', error);
      throw error;
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
