import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, ArrowRight, Lock } from "lucide-react";
import { track } from '@vercel/analytics/react';
import { supabase } from '@/integrations/supabase/client';

const AuthRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Get auth parameters from URL 
  const params = new URLSearchParams(location.search);
  const authMode = params.get('mode') || 'signin';
  const authProvider = params.get('provider') || 'email';
  
  // Get the original path the user was trying to access
  const fromLocation = location.state?.from;
  
  const getAuthUrl = () => {
    let returnUrl = `${window.location.protocol}//${window.location.host}/auth-callback`;
    
    // If there was a from location, add it as a parameter to be processed after authentication
    if (fromLocation) {
      returnUrl += `?redirect=${encodeURIComponent(fromLocation.pathname + fromLocation.search)}`;
    }
    
    let signInOrUp = (authMode === 'signup') ? 'signUp' : 'signIn';
    return { returnUrl, signInOrUp };
  };
  
  const redirectToAuth = async () => {
    if (isRedirecting) return;
    
    setIsRedirecting(true);
    const { returnUrl, signInOrUp } = getAuthUrl();
    
    // Track the auth redirect
    track('auth_redirect', { 
      destination: 'supabase', 
      mode: authMode, 
      provider: authProvider 
    });
    
    try {
      if (authProvider === 'google') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: returnUrl
          }
        });
        
        if (error) throw error;
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        // Redirect to the main auth page (handled by Supabase)
        navigate('/auth', { replace: true });
      }
    } catch (error) {
      console.error('Auth redirect error:', error);
      navigate('/auth', { replace: true });
    }
  };
  
  // Automatically countdown and redirect
  useEffect(() => {
    if (user) {
      navigate('/journal', { replace: true });
      return;
    }
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          redirectToAuth();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [user, navigate]);
  
  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-dream">REM</CardTitle>
          <CardDescription className="text-lg">
            Secure Authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-dream-100 dark:bg-dream-900 flex items-center justify-center">
                <Lock className="h-8 w-8 text-dream-600" />
              </div>
            </div>
            
            <Alert className="bg-blue-50 dark:bg-blue-900/10">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm">
                <p className="mb-2">You're being redirected to our secure authentication service in <strong>{countdown}</strong> seconds.</p>
                <p>REM uses Supabase to ensure your account stays secure. You might briefly see "jduzfrjhxfxiyajvpkus.supabase.co" in the URL - this is normal and secure.</p>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={redirectToAuth} 
              disabled={isRedirecting}
              className="w-full"
            >
              Continue to Secure Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-xs text-muted-foreground">
          <p>REM Dream Journal &copy; {new Date().getFullYear()}</p>
          <p>Authentication secured by Supabase</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthRedirect; 