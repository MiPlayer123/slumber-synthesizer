import React, { useState } from 'react'; // Removed useEffect, useLocation
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react"; // Assuming lucide-react is installed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext'; // Make sure this path is correct
import { Navigate } from 'react-router-dom';

const Auth = () => {
  // Get state and functions from AuthContext
  const {
    user,
    signIn,
    signUp,
    signInWithGoogle,
    forgotPassword,
    completeGoogleSignUp,
    loading: authLoading, // Rename to avoid conflict with any potential local loading states
    needsProfileCompletion
  } = useAuth();

  // Local state for forms
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // For regular signup
  const [fullName, setFullName] = useState(''); // For regular signup
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [googleUsername, setGoogleUsername] = useState(''); // For Google completion
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- Redirection Logic ---
  // Redirect logged-in users *unless* they need profile completion
  if (user && !needsProfileCompletion) {
    console.log("Auth.tsx: User logged in and profile complete, redirecting to /journal");
    // Using Navigate component for declarative redirect
    return <Navigate to="/journal" replace />;
  }

  // --- Form Validation ---
  const validateForm = (isCompletingGoogle = false): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (isCompletingGoogle) {
      if (!googleUsername || googleUsername.trim() === '') {
        newErrors.googleUsername = 'Username is required.';
      } else if (googleUsername.trim().length < 3) {
        newErrors.googleUsername = 'Username must be at least 3 characters.';
      } // Add other username rules (e.g., allowed characters) if needed
    } else {
      if (!email) newErrors.email = 'Email is required.';
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format.';

      if (!password) newErrors.password = 'Password is required.';
      else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';

      if (isSignUpMode) {
        if (!username || username.trim() === '') {
          newErrors.username = 'Username is required.';
        } else if (username.trim().length < 3) {
          newErrors.username = 'Username must be at least 3 characters.';
        } // Add other username rules
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Event Handlers ---
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let result;
    if (isSignUpMode) {
      result = await signUp(email, password, username, fullName);
    } else {
      result = await signIn(email, password);
    }

    if (!result.success && result.error) {
        // If the context function didn't show a toast or for specific errors
        if (result.error.message.includes('Username is already taken')) {
            setErrors(prev => ({ ...prev, username: result.error?.message }));
        } else if (result.error.message.includes('Invalid login credentials')) {
             setErrors(prev => ({ ...prev, email: 'Invalid email or password.', password: ' ' })); // Show general error
        }
        // Context usually shows a generic toast on error
    }
    // On success, the redirect logic at the top handles navigation
  };

  const handleGoogleSignInClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signInWithGoogle();
  };

  const handleCompleteGoogleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    const result = await completeGoogleSignUp(googleUsername);

    if (!result.success && result.error) {
       if (result.error.message.includes('Username is already taken')) {
            setErrors(prev => ({ ...prev, googleUsername: result.error?.message }));
       }
        // Context shows a generic toast on error
    }
    // On success, the redirect logic handles navigation
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setErrors({ resetEmail: 'Please enter a valid email.' });
      return;
    }
    setErrors({}); // Clear potential previous errors
    const result = await forgotPassword(resetEmail);
    if (result.success) {
      setIsResetDialogOpen(false); // Close dialog on success
      setResetEmail(''); // Clear field
    } else {
      // Show error if needed, context might already show a toast
      setErrors({ resetEmail: result.error?.message || 'Failed to send reset link.' });
    }
  };

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setErrors({}); // Clear errors when switching modes
    // Reset fields when switching
    setEmail('');
    setPassword('');
    setUsername('');
    setFullName('');
  };

  // --- Conditional Rendering ---

  // 1. Render Google Username Completion Form if needed
  if (user && needsProfileCompletion) {
    return (
      <div className="container flex min-h-screen items-center justify-center px-4 py-12 animate-fade-in">
        <Card className="w-full max-w-md glass-card"> {/* Added max-width */}
          <CardHeader>
            <CardTitle>One Last Step</CardTitle>
            <CardDescription>
              Welcome! Choose a username to complete your sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteGoogleSignUpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleUsername">Username</Label>
                <Input
                  id="googleUsername"
                  value={googleUsername}
                  onChange={(e) => {
                    setGoogleUsername(e.target.value);
                    if (errors.googleUsername) setErrors(prev => ({ ...prev, googleUsername: '' }));
                  }}
                  required
                  autoFocus // Focus on the input field
                  className={errors.googleUsername ? "border-destructive" : ""} // Use destructive variant color
                  aria-describedby="googleUsernameError"
                  aria-invalid={!!errors.googleUsername}
                />
                {errors.googleUsername && (
                  <p id="googleUsernameError" className="text-sm text-destructive">{errors.googleUsername}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                 ) : 'Complete Sign Up'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Render Standard Sign In / Sign Up Form
  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-12 animate-fade-in">
      <Card className="w-full max-w-md glass-card"> {/* Added max-width */}
        <CardHeader>
          <CardTitle>{isSignUpMode ? 'Create Account' : 'Welcome Back'}</CardTitle>
          <CardDescription>
            {isSignUpMode ? 'Start your dream journey' : 'Sign in to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email/Password Form */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({...prev, email: '', password: ''})); // Clear related errors
                }}
                required
                className={errors.email ? "border-destructive" : ""}
                aria-describedby="emailError"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p id="emailError" className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUpMode ? "new-password" : "current-password"}
                value={password}
                 onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password || errors.email?.includes('Invalid')) { // Clear password error or general login error
                        setErrors(prev => ({...prev, password: '', email: errors.email?.includes('Invalid') ? '' : prev.email }));
                    }
                }}
                required
                className={errors.password ? "border-destructive" : ""}
                aria-describedby="passwordError"
                aria-invalid={!!errors.password}
              />
              {errors.password && <p id="passwordError" className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {/* Forgot Password Link */}
            {!isSignUpMode && (
              <div className="text-right text-sm">
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email to receive a password reset link.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="resetEmail" className="sr-only">Email</Label> {/* Sr-only if title is clear */}
                        <Input
                          id="resetEmail"
                          type="email"
                          autoComplete="email"
                          value={resetEmail}
                          onChange={(e) => {
                            setResetEmail(e.target.value);
                            if (errors.resetEmail) setErrors(prev => ({ ...prev, resetEmail: '' }));
                          }}
                          placeholder="you@example.com"
                          required
                          className={errors.resetEmail ? "border-destructive" : ""}
                          aria-describedby="resetEmailError"
                          aria-invalid={!!errors.resetEmail}
                        />
                        {errors.resetEmail && <p id="resetEmailError" className="text-sm text-destructive">{errors.resetEmail}</p>}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={authLoading}>
                          {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Send Reset Link
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Sign Up Fields */}
            {isSignUpMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username) setErrors(prev => ({...prev, username: ''}));
                    }}
                    required
                    className={errors.username ? "border-destructive" : ""}
                    aria-describedby="usernameError"
                    aria-invalid={!!errors.username}
                  />

{errors.username && <p id="usernameError" className="text-sm text-destructive">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name (Optional)</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUpMode ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUpMode ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignInClick}
            disabled={authLoading} // Disable while any auth operation is loading
          >
            {authLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {/* Google SVG Icon - Ensure you have this SVG's path data */}
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.5 512 0 401.5 0 265.8 0 129.8 110.3 19.8 244 19.8c65.5 0 117.8 26.1 158.8 65.1l-63.4 61.7c-22.5-21.5-54.4-35.9-95.4-35.9-74.3 0-134.3 60-134.3 134.3s60 134.3 134.3 134.3c82.3 0 114.8-54.1 119.1-82.5H244V261.8h244z"></path>
                </svg>
                Google
              </>
            )}
          </Button>

          {/* Toggle Sign In/Sign Up */}
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              disabled={authLoading}
            >
              {isSignUpMode
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
