import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { track } from "@vercel/analytics/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";

const ResetPassword = () => {
  const { user, resetPassword, loading: authLoading, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<
    "valid" | "expired" | "invalid" | "checking"
  >("checking");
  const [showRetry, setShowRetry] = useState(false);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Function Definitions (useCallback) ---
  const checkResetParameters = useCallback((): boolean => {
    // Check in hash fragment
    const hash = location.hash;
    const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;

    // Check in query parameters
    const searchParams = new URLSearchParams(location.search);

    // Look for any combination of parameters that would make this a valid reset link

    // 0. Check for Supabase auth code (highest priority, this is the main flow)
    if (searchParams.has("code")) {
      console.log("Found Supabase auth code:", searchParams.get("code"));
      return true;
    }

    // 1. Check for type=recovery
    if (
      searchParams.get("type") === "recovery" ||
      hashParams?.get("type") === "recovery"
    ) {
      return true;
    }

    // 2. Check for token
    if (searchParams.has("token") || hashParams?.has("token")) {
      return true;
    }

    // 3. Check for Supabase-specific tokens
    const hasAccessToken =
      searchParams.has("access_token") || hashParams?.has("access_token");
    const hasRefreshToken =
      searchParams.has("refresh_token") || hashParams?.has("refresh_token");
    if (hasAccessToken || hasRefreshToken) {
      return true;
    }

    return false;
  }, [location]);

  // --- useEffect Hooks ---
  useEffect(() => {
    console.log("Processing URL parameters", {
      search: location.search,
      hash: location.hash,
      isUserLoggedIn: !!user,
    });

    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");

    // If there's a code in the URL, we're in a password reset flow
    // even if the user appears to be logged in (as Supabase auto-creates a session)
    if (code) {
      console.log(
        "Password reset code detected, allowing reset flow even if user appears logged in",
      );
      setIsPasswordResetFlow(true);
    }

    // Check for explicit error parameters
    if (
      searchParams.get("error") === "access_denied" &&
      searchParams.get("error_code") === "otp_expired"
    ) {
      setTokenStatus("expired");
      setError(
        "Your password reset link has expired. Please request a new one.",
      );
      track("password_reset_error", { error_type: "token_expired" });
      return;
    }

    // Check if the URL contains valid token parameters
    const isValid = checkResetParameters();
    setTokenStatus(isValid ? "valid" : "invalid");

    if (!isValid) {
      console.log("Invalid reset link parameters detected", {
        hash: location.hash,
        search: location.search,
      });
    } else {
      console.log("Valid reset link detected");
    }
  }, [location, user, checkResetParameters]);

  // Only redirect if user is logged in AND this is NOT a password reset flow
  if (user && !isPasswordResetFlow) {
    return <Navigate to="/journal" replace />;
  }

  if (tokenStatus === "expired") {
    return (
      <div className="container max-w-md mx-auto px-4 py-12">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Password Reset Link Expired</CardTitle>
            <CardDescription>
              Your password reset link has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Expired Link</AlertTitle>
              <AlertDescription>
                Password reset links are valid for 1 hour for security reasons.
              </AlertDescription>
            </Alert>

            <p className="mb-4 text-sm">
              Please request a new password reset link to continue.
            </p>

            <div className="flex flex-col gap-4">
              <Button onClick={() => navigate("/auth")} className="w-full">
                Request New Reset Link
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/password-reset-troubleshoot")}
                className="w-full"
              >
                Get Help
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="container max-w-md mx-auto px-4 py-12">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This doesn't appear to be a valid password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm">
              The link you clicked may be malformed or has already been used.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Return to Login
            </Button>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Need a new reset link?{" "}
                <a href="/auth" className="text-dream-600 hover:underline">
                  Try again
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dream-600 mb-4"></div>
          <p className="text-dream-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    // Clear error and reset retry state
    setError("");
    setShowRetry(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowRetry(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      track("password_reset_error", { type: "password_mismatch" });
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      track("password_reset_error", { type: "password_too_short" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the code parameter for additional logging
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get("code");

      console.log("Submitting password reset request", {
        hasCode: !!code,
        tokenStatus,
        urlParams: {
          search:
            location.search.substring(0, 20) +
            (location.search.length > 20 ? "..." : ""),
          hash:
            location.hash.substring(0, 20) +
            (location.hash.length > 20 ? "..." : ""),
        },
      });

      // Call the resetPassword function
      const result = await resetPassword(password);

      if (!result.success) {
        console.error("Password reset failed with result:", result);
        throw result.error || new Error("Unknown error during password reset");
      }

      console.log("Password reset successful, redirecting to auth page");
      track("password_reset_success");

      // Force reload the page to clear any potential active session state
      window.localStorage.removeItem("supabase.auth.token");

      // Redirect to login with success message
      navigate("/auth", {
        state: {
          passwordReset: true,
          message:
            "Your password has been reset successfully. Please sign in with your new password.",
        },
        replace: true, // Replace history to prevent back navigation to the reset page
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Password reset error:", errorMessage);

      // Check for specific error messages related to token issues
      if (
        errorMessage.toLowerCase().includes("expired") ||
        errorMessage.toLowerCase().includes("session") ||
        errorMessage.toLowerCase().includes("token")
      ) {
        setTokenStatus("expired");
      } else if (
        errorMessage.toLowerCase().includes("code challenge") ||
        errorMessage.toLowerCase().includes("already been used")
      ) {
        // Special handling for PKCE errors - link already used
        setError(
          "This password reset link has already been used or can no longer be processed. Please request a new link.",
        );
        // Instead of retry, direct to auth page
        setShowRetry(true);
      } else if (
        errorMessage.toLowerCase().includes("time") ||
        errorMessage.toLowerCase().includes("timeout")
      ) {
        // Show retry option for timeout errors
        setError(`The request timed out. Please try again.`);
        setShowRetry(true);
      } else {
        setError(`Failed to reset password: ${errorMessage}`);
        setShowRetry(true);
      }

      track("password_reset_error", {
        type: "reset_failed",
        error: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user && isPasswordResetFlow && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-600 dark:text-blue-400">
                Password Reset Session
              </AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-400">
                You are currently in a password reset session. Complete the form
                below to reset your password.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive" className="mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showRetry ? (
              <div className="flex gap-2">
                <Button type="button" className="flex-1" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/password-reset-troubleshoot")}
                >
                  Get Help
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Resetting Password..." : "Reset Password"}
              </Button>
            )}

            {/* Add troubleshooter link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Having trouble resetting your password?{" "}
                <a
                  href="/password-reset-troubleshoot"
                  className="text-dream-600 hover:underline"
                >
                  Get help
                </a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
