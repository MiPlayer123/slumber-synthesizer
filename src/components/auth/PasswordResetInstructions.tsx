import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const PasswordResetInstructions = () => {
  return (
    <Alert className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-600 dark:text-blue-400">How Password Reset Works</AlertTitle>
      <AlertDescription className="text-blue-600 dark:text-blue-400">
        <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
          <li>You'll receive an email with a reset link (check spam folder)</li>
          <li>Click the link in your email</li>
          <li>You'll be redirected to our password reset page</li>
          <li>Enter and confirm your new password</li>
          <li>Once successful, you can sign in with your new password</li>
        </ol>
        <p className="text-xs mt-2">
          For security reasons, reset links expire after 1 hour.
        </p>
      </AlertDescription>
    </Alert>
  );
}; 