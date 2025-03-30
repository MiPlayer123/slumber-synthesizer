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
import { CheckCircle } from "lucide-react";
import { PasswordResetInstructions } from '@/components/auth/PasswordResetInstructions';

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, forgotPassword, completeGoogleSignUp, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [googleUsername, setGoogleUsername] = useState('');
  const location = useLocation();

  // Check URL for error parameters and success states when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    // Check for location state that might have been passed during navigation
    if (location.state && 'passwordReset' in location.state && location.state.passwordReset === true) {
      setShowPasswordResetSuccess(true);
      
      // Show toast if there's a custom message
      if (location.state.message) {
        toast({
          title: "Success",
          description: location.state.message,
        });
      }
      
      // Clear the state after showing to prevent repeat on refresh
      window.history.replaceState({}, document.title);
    }
    
    // If we detect the specific database error for new user, show username form
    if (error === 'server_error' && errorDesc?.includes('Database error saving new user')) {
      setIsGoogleSignUp(true);
    }
  }, [location, toast]);

  if (user) {
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

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isGoogleSignUp) {
      try {
        await signInWithGoogle();
        track('user_signin', { method: 'google' });
      } catch (error) {
        console.error("Google authentication error:", error);
        track('auth_error', { 
          type: 'signin',
          method: 'google',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      if (!googleUsername || googleUsername.trim() === '') {
        setErrors({...errors, googleUsername: 'Username is required'});
        return;
      }
      
      try {
        await completeGoogleSignUp(googleUsername);
        track('user_signup', { method: 'google' });
        setIsGoogleSignUp(false);
        setGoogleUsername('');
      } catch (error) {
        console.error("Google username registration error:", error);
        track('auth_error', { 
          type: 'signup',
          method: 'google',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        setErrors({...errors, googleUsername: 'Failed to register username, please try again'});
      }
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
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleUsername">Username</Label>
                <Input
                  id="googleUsername"
                  value={googleUsername}
                  onChange={(e) => setGoogleUsername(e.target.value)}
                  className={errors.googleUsername ? "border-red-500" : ""}
                />
                {errors.googleUsername && (
                  <p className="text-red-500 text-xs mt-1">{errors.googleUsername}</p>
                )}
              </div>

              <Button 
                type="button" 
                onClick={handleGoogleSignIn}
                className="w-full"
              >
                Complete Sign Up
              </Button>
              
              <Button 
                type="button" 
                onClick={() => setIsGoogleSignUp(false)}
                variant="outline"
                className="w-full mt-2"
              >
                Cancel
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Forgot Password link */}
            {!isSignUp && (
              <div className="text-right">
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button 
                      type="button" 
                      className="text-sm text-dream-600 hover:underline"
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
                      <div className="mt-4 text-center text-sm text-gray-500">
                        Having trouble? <a href="/password-reset-help" className="text-dream-600 hover:underline">Visit our troubleshooter</a>
                      </div>
                      
                      <PasswordResetInstructions />
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
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
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
                  Google
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
                className="text-dream-600 hover:underline"
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
