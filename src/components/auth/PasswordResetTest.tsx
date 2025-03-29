import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export const PasswordResetTest = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // The resetPasswordForEmail endpoint will be called from within the AuthContext
      const { error } = await forgotPassword(email);
      
      if (error) {
        throw new Error(error.message);
      }
      
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to send reset email");
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold">Request Password Reset</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your email address below to receive a password reset link.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={status === "loading"} 
            className="w-full"
          >
            {status === "loading" ? "Sending..." : "Send Reset Link"} 
            {status !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </div>
      
      {status === "success" && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-400">Check Your Email</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            A password reset link has been sent to {email}. Please check your inbox and spam folder.
          </AlertDescription>
        </Alert>
      )}
      
      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Send Reset Link</AlertTitle>
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-sm text-center text-gray-600 dark:text-gray-400">
        The reset link will expire after 1 hour. If you don't receive an email, please check your spam folder or try again.
      </div>
    </div>
  );
}; 