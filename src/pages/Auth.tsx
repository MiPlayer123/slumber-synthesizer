
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [googleUsername, setGoogleUsername] = useState('');
  const location = useLocation();

  // Check URL for error parameters when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    // If we detect the specific database error for new user, show username form
    if (error === 'server_error' && errorDesc?.includes('Database error saving new user')) {
      setIsGoogleSignUp(true);
    }
  }, [location]);

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
      if (isSignUp) {
        await signUp(email, password, username, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isGoogleSignUp) {
      // Start the normal Google sign-in flow
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Google authentication error:", error);
      }
    } else {
      // Handle completing the Google sign-up with username
      if (!googleUsername || googleUsername.trim() === '') {
        setErrors({...errors, googleUsername: 'Username is required'});
        return;
      }
      
      try {
        await completeGoogleSignUp(googleUsername);
        setIsGoogleSignUp(false);
        setGoogleUsername('');
      } catch (error) {
        console.error("Google username registration error:", error);
        setErrors({...errors, googleUsername: 'Failed to register username, please try again'});
      }
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

            <Button type="submit" className="w-full">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            type="button" 
            onClick={handleGoogleSignIn} 
            variant="outline" 
            className="w-full"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 488 512" 
              className="h-4 w-4 mr-2"
              fill="currentColor"
            >
              <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-dream-600 hover:underline"
            >
              {isSignUp
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
function completeGoogleSignUp(googleUsername: string) {
  throw new Error('Function not implemented.');
}

