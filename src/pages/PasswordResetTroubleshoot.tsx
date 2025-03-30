import { PasswordResetTest } from "@/components/auth/PasswordResetTest";
import { PasswordResetTester } from "@/components/auth/PasswordResetTester";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PasswordResetTroubleshoot = () => {
  const location = useLocation();
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired') === 'true') {
      setShowExpiredAlert(true);
    }
  }, [location]);
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Password Reset Troubleshooter
      </h1>
      <p className="text-center mb-8 max-w-2xl mx-auto">
        If you're having trouble with the password reset functionality, this
        page will help diagnose the issue and provide detailed information about
        what might be going wrong.
      </p>
      
      {showExpiredAlert && (
        <Alert variant="destructive" className="max-w-xl mx-auto mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expired Reset Link</AlertTitle>
          <AlertDescription>
            The password reset link you used has expired. For security reasons, these links are only valid for 1 hour.
            Please request a new password reset link using the form below.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="standard" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Reset</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Reset</TabsTrigger>
        </TabsList>
        <TabsContent value="standard" className="py-4">
          <PasswordResetTest />
        </TabsContent>
        <TabsContent value="advanced" className="py-4">
          <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-300">
            Use this advanced tool if you have a code from a reset link that isn't working properly.
          </div>
          <PasswordResetTester />
        </TabsContent>
      </Tabs>
      
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Common Issues & Solutions</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Email Not Received</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Check your spam folder. Email providers sometimes filter out password reset emails.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Invalid or Expired Link</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Password reset links expire after 1 hour. Request a new reset email if needed.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Already Used Link</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Password reset links can only be used once. If you see an error about "code challenge", 
              this means the link was already used or your browser data was cleared. Request a new link.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Password Reset Not Working</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              If you're reaching the reset form but the new password isn't saving, try the "Advanced Reset" tool above.
              This directly processes the code from your reset link.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Account Not Found</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Make sure you're using the same email address you used to sign up.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Still Having Issues?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Contact support at support@slumber-synthesizer.com or try creating a new account.
            </p>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-700 dark:text-blue-300">Advanced Troubleshooting</h3>
            <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">
              If you received a reset link but it doesn't work, you can analyze the link with our debug tool.
            </p>
            <p className="text-sm mt-2">
              <a 
                href="/password-reset-debug" 
                className="text-blue-700 dark:text-blue-300 font-medium hover:underline flex items-center"
              >
                Open Password Reset Link Debugger <ArrowRight className="ml-1 h-3 w-3" />
              </a>
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Note: When clicked from your email, copy the entire URL from your browser and paste it after navigating to the debugger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetTroubleshoot; 