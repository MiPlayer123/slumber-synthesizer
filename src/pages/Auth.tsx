import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";
import { track } from '@vercel/analytics/react';
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, forgotPassword, completeGoogleSignUp, loading, needsProfileCompletion } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [googleUsername, setGoogleUsername] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Check if user needs profile completion
  useEffect(() => {
    const checkUser = async () => {
      if (!user) return;

      console.log('Auth component: Current user state from Supabase', {
        hasUser: !!user,
        userId: user?.id,
        provider: user?.app_metadata?.provider,
        hasUsername: !!user?.user_metadata?.username,
        username: user?.user_metadata?.username,
        hasFullName: !!user?.user_metadata?.full_name || !!user?.user_metadata?.name,
        fullName: user?.user_metadata?.full_name || user?.user_metadata?.name
      });

      // Check profile in database
      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .eq('id', user.id)
          .maybeSingle();
          
        console.log('Auth component: Database profile state', {
          hasProfile: !!profile,
          profileUsername: profile?.username,
          profileFullName: profile?.full_name,
          profileError: profileError?.message
        });

        // If user is authenticated but has no username, show username creation
        if (!profile?.username && !user.user_metadata?.username) {
          console.log('Auth component: User needs username creation');
          setIsGoogleSignUp(true);
          return;
        }
      }
      
      // If user has a complete profile, redirect to journal
      if (user && !needsProfileCompletion) {
        console.log('Auth component: User authenticated and profile complete, redirecting to journal');
        navigate('/journal', { replace: true });
      }
    };

    checkUser();
  }, [user, needsProfileCompletion, navigate, supabase]);

  // Check URL for error parameters when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    // If we detect the specific database error for new user, show username form
    if (error === 'server_error' && errorDesc?.includes('Database error saving new user')) {
      setIsGoogleSignUp(true);
    }

    // Check if this is a Google redirect
    if (user?.app_metadata?.provider === 'google' && !user.user_metadata?.username) {
      console.log('Auth component: Detected Google redirect without username');
      setIsGoogleSignUp(true);
    }
  }, [location, user]);

  // Check if user needs profile completion
  useEffect(() => {
    if (needsProfileCompletion) {
      console.log('Auth component: needsProfileCompletion changed to true');
      setIsGoogleSignUp(true);
    }
  }, [needsProfileCompletion]);

  if (user && !needsProfileCompletion) {
    console.log('Auth component: User authenticated and profile complete, redirecting to journal');
    return <Navigate to="/journal" replace />;
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    
    if (isSignUp) {
      if (!username || username.trim() === '') {
        newErrors.username = 'Username is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      console.log(`Attempting to ${isSignUp ? 'sign up' : 'sign in'}...`);
      if (isSignUp) {
        await signUp(email, password, username, fullName);
        track('user_signup', { method: 'email' });
      } else {
        await signIn(email, password);
        track('user_signin', { method: 'email' });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      track('auth_error', { 
        type: isSignUp ? 'signup' : 'signin',
        method: 'email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setErrors({});
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrors({ 
        google: error instanceof Error ? error.message : 'Failed to sign in with Google' 
      });
    }
  };

  const handleGoogleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUsername.trim()) {
      setErrors({ username: 'Username is required' });
      return;
    }

    try {
      const result = await completeGoogleSignUp(googleUsername);
      if (result.success) {
        track('user_signup', { method: 'google' });
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error completing Google sign up:', error);
      setErrors({ 
        username: error instanceof Error ? error.message : 'Failed to complete sign up' 
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add proper validation for email
    if (!resetEmail || !resetEmail.includes('@') || !resetEmail.includes('.')) {
      setErrors({...errors, resetEmail: 'Please enter a valid email address'});
      return;
    }
    
    try {
      console.log('Requesting password reset for:', resetEmail);
      
      // Show immediate feedback
      toast({
        title: "Sending reset email",
        description: "Please wait...",
      });
      
      await forgotPassword(resetEmail);
      track('password_reset_requested', { email_domain: resetEmail.split('@')[1] });
      
      // Clear the input and reset dialog
      setResetEmail('');
      setIsResetDialogOpen(false);
      
      // Show comprehensive instructions to the user
      toast({
        title: "Email Sent",
        description: "Check your inbox and spam folder for the reset link. The link expires in 1 hour.",
      });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      track('auth_error', { 
        type: 'password_reset',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Keep dialog open on error
      setErrors({...errors, resetEmail: 'Could not send reset email. Please try again.'});
    }
  };

  // Render Google username form if in Google sign-up flow
  if (isGoogleSignUp) {
    return (
      <div className="container max-w-md mx-auto px-4 py-12">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>One Last Step</CardTitle>
            <CardDescription>
              Please choose a username to complete your sign up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGoogleSignUpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleUsername">Username</Label>
                <Input
                  id="googleUsername"
                  value={googleUsername}
                  onChange={(e) => setGoogleUsername(e.target.value)}
                  className={errors.username ? "border-red-500" : ""}
                  placeholder="Choose a username"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Sign Up...
                  </>
                ) : (
                  'Complete Sign Up'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create an Account' : 'Welcome Back'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Start your dream journey' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showPasswordResetSuccess && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-600 dark:text-green-400">Password Reset Successful</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Your password has been reset. You can now sign in with your new password.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={errors.password ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Forgot Password link */}
            {!isSignUp && (
              <div className="text-right">
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button 
                      type="button" 
                      className="text-sm text-dream-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="resetEmail">Email</Label>
                        <Input
                          id="resetEmail"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className={errors.resetEmail ? "border-red-500" : ""}
                        />
                        {errors.resetEmail && (
                          <p className="text-red-500 text-xs mt-1">{errors.resetEmail}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </DialogFooter>
                      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Having trouble? <a href="/password-reset-troubleshoot" className="text-dream-600 dark:text-blue-400 hover:underline">Visit our troubleshooter</a>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={errors.username ? "border-red-500" : ""}
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name (Optional)</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Submit Button - Fixed disabled state */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
            
            {/* Social Sign-in */}
            <div className="relative my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              <span className="mx-4 text-sm font-medium uppercase text-gray-500 dark:text-gray-500">OR CONTINUE WITH</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full dark:bg-[#1e2030] dark:hover:bg-[#252a3d] dark:text-white dark:border-[#2a2f42]"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full mr-2"></div>
                  Connecting...
                </div>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
            
            {/* Toggle between sign in and sign up */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-dream-600 dark:text-blue-400 hover:underline"
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
