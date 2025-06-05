"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics/react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const {
    user,
    signIn,
    signUp,
    signInWithGoogle,
    forgotPassword,
    error: authError,
    loading,
    completeGoogleSignUp,
    needsProfileCompletion,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCompletingGoogleSignUp, setIsCompletingGoogleSignUp] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    // Check for a sign-up preference from the landing page
    const authMode = sessionStorage.getItem("auth-mode");
    if (authMode === "signup") {
      setIsSignUp(true);
      sessionStorage.removeItem("auth-mode");
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      if (needsProfileCompletion) {
        setIsCompletingGoogleSignUp(true);
      } else {
        const from = searchParams.get("from") || "/dream-wall";
        router.replace(from);
      }
    }
  }, [user, loading, needsProfileCompletion, router, searchParams]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    track(isSignUp ? "sign_up_attempt" : "sign_in_attempt", {
      method: "email",
    });

    try {
      if (isSignUp) {
        await signUp(email, password, username, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      // Error is already handled and toasted in the AuthContext
      console.error("Auth page: Auth action failed", error);
    }
  };

  const handleGoogleSignIn = async () => {
    track("sign_in_attempt", { method: "google" });
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Auth page: Google sign-in failed", error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    try {
      await forgotPassword(resetEmail);
      setIsResetDialogOpen(false);
      setResetEmail("");
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a link to reset your password.",
      });
    } catch (error) {
      // Error is already handled and toasted in the AuthContext
      console.error("Auth page: Forgot password failed", error);
    }
  };

  const handleCompleteGoogleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    track("google_signup_completion_attempt");
    try {
      await completeGoogleSignUp(username);
    } catch (error) {
      console.error("Auth page: Google sign-up completion failed", error);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isCompletingGoogleSignUp) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Choose a username to finish setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteGoogleSignUp}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g., dream-weaver"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Username
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isSignUp ? "Create an Account" : "Sign In"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Enter your details to get started."
              : "Enter your credentials to access your journal."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuthAction}>
            <div className="grid gap-4">
              {isSignUp && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="e.g., Ada Lovelace"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="e.g., dream-weaver"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isSignUp && (
                <div className="text-right text-sm">
                  <Dialog
                    open={isResetDialogOpen}
                    onOpenChange={setIsResetDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <button className="underline">Forgot password?</button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your email and we'll send you a link to reset
                          your password.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleForgotPassword}>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="m@example.com"
                              required
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={loading}>
                              {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Send Reset Link
                            </Button>
                          </DialogFooter>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              {authError && (
                <p className="text-sm text-red-500">{authError.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button onClick={() => setIsSignUp(true)} className="underline">
                  Sign Up
                </button>
              </>
            )}
          </div>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.2 0 256S111.8 0 244 0c71.4 0 133.2 29.3 178.9 76.5l-68.5 68.5c-24.2-22.9-55.6-37.1-90.4-37.1-69.7 0-126.5 56.8-126.5 126.5s56.8 126.5 126.5 126.5c82.2 0 112.2-61.9 115.6-94.2H244v-83.3h237.9c2.3 12.3 3.5 25.1 3.5 38.2z"
                ></path>
              </svg>
            )}
            Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
