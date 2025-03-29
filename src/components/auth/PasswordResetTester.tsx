import { useState, useEffect } from "react";
import { supabase, isValidSupabaseConfig } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const PasswordResetTester = () => {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isConfigured, setIsConfigured] = useState(isValidSupabaseConfig());

  useEffect(() => {
    // Check configuration on mount
    setIsConfigured(isValidSupabaseConfig());
  }, []);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`]);
  };

  const handleDirectPasswordReset = async () => {
    if (!isConfigured) {
      setErrorMessage("Supabase client is not properly configured. Contact support.");
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("Please enter the recovery code");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Please enter a valid password (min 6 characters)");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setLogs([]);
    
    try {
      addLog(`Starting direct password reset with code: ${code.substring(0, 5)}...`);
      
      // Step 1: Exchange the code for a session
      addLog("Exchanging code for session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        addLog(`Session exchange failed: ${sessionError.message}`);
        throw new Error(`Failed to exchange code: ${sessionError.message}`);
      }
      
      addLog("Code exchange successful");
      addLog(`User ID: ${sessionData?.user?.id || 'unknown'}`);
      
      // Step 2: Update the user's password
      addLog("Updating password...");
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        addLog(`Password update failed: ${updateError.message}`);
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
      
      addLog("Password updated successfully");
      
      // Step 3: Sign out to clean up the session
      addLog("Signing out...");
      await supabase.auth.signOut();
      addLog("Signed out successfully");
      
      setStatus("success");
    } catch (error) {
      setStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(errorMessage);
      addLog(`Error: ${errorMessage}`);
    }
  };

  // If Supabase isn't configured properly, show a warning
  if (!isConfigured) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            The authentication service is not properly configured. This usually happens when environment variables are missing. 
            Please contact support or check your application configuration.
          </AlertDescription>
        </Alert>
        
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold mb-4">Cannot Process Password Reset</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The application is missing essential configuration needed to process password resets.
          </p>
          <Button
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold">Direct Password Reset</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This tool allows you to test the password reset functionality directly with a recovery code.
        </p>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="code">Recovery Code</Label>
            <Input
              id="code"
              placeholder="Paste your recovery code here"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={status === "loading"}
            />
            <p className="text-xs text-gray-500">
              This is the code from your password reset link (after the ?code= part)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={status === "loading"}
            />
          </div>
          
          <Button 
            onClick={handleDirectPasswordReset}
            disabled={status === "loading"} 
            className="w-full"
          >
            {status === "loading" ? "Processing..." : "Reset Password"} 
            {status !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {status === "success" && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-400">Password Reset Successful</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your password has been successfully reset. You can now log in with your new password.
          </AlertDescription>
        </Alert>
      )}
      
      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Reset Failed</AlertTitle>
          <AlertDescription>
            {errorMessage || "An error occurred while resetting your password."}
          </AlertDescription>
        </Alert>
      )}
      
      {logs.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium mb-2">Reset Process Logs</h3>
          <Textarea
            className="font-mono text-xs h-32"
            readOnly
            value={logs.join("\n")}
          />
        </div>
      )}
    </div>
  );
}; 