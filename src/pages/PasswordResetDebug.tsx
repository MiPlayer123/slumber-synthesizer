import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, Check } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

const PasswordResetDebug = () => {
  const [urlDetails, setUrlDetails] = useState<Record<string, any>>({});
  const [authCodeValid, setAuthCodeValid] = useState<boolean | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract and display all URL information
    const hash = window.location.hash;
    const search = window.location.search;
    
    const hashParams = hash ? Object.fromEntries(new URLSearchParams(hash.substring(1))) : {};
    const searchParams = search ? Object.fromEntries(new URLSearchParams(search)) : {};
    
    setUrlDetails({
      origin: window.location.origin,
      pathname: window.location.pathname,
      fullUrl: window.location.href,
      hash,
      search,
      hashParams,
      searchParams,
    });
    
    // If there's a code parameter, validate it
    const code = searchParams['code'];
    if (code) {
      validateAuthCode(code);
    }
  }, [location]);
  
  // Function to check if a Supabase auth code is valid
  const validateAuthCode = async (code: string) => {
    setIsCheckingCode(true);
    setAuthCodeValid(null);
    setCodeError(null);
    
    try {
      // Attempt to exchange the code for a session (but catch the error and don't actually complete it)
      // Note: This is a dry run to check validity without actually creating a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth code validation error:', error);
        setAuthCodeValid(false);
        setCodeError(error.message);
      } else {
        console.log('Auth code appears valid:', data);
        setAuthCodeValid(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error validating auth code:', message);
      setAuthCodeValid(false);
      setCodeError(message);
    } finally {
      setIsCheckingCode(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Password Reset Link Debugger</CardTitle>
          <CardDescription>
            This page analyzes your reset link to help understand any issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {urlDetails.searchParams?.code && (
              <Alert 
                className={authCodeValid === true 
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                  : authCodeValid === false 
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }
              >
                {isCheckingCode ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent" />
                ) : authCodeValid === true ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : authCodeValid === false ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                
                <AlertTitle className={authCodeValid === true 
                  ? "text-green-600 dark:text-green-400" 
                  : authCodeValid === false 
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }>
                  {authCodeValid === true 
                    ? "Valid Auth Code Detected" 
                    : authCodeValid === false 
                      ? "Invalid Auth Code"
                      : "Auth Code Detected"}
                </AlertTitle>
                <AlertDescription className={authCodeValid === true 
                  ? "text-green-600 dark:text-green-400" 
                  : authCodeValid === false 
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }>
                  {authCodeValid === true 
                    ? "This code appears to be valid. You should be able to reset your password." 
                    : authCodeValid === false 
                      ? `Auth code error: ${codeError || "The code is invalid or has expired."}`
                      : "Found a Supabase auth code in your URL. Checking validity..."}
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <h2 className="text-lg font-medium mb-2">Link Analysis</h2>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap break-all">
                  {JSON.stringify(urlDetails, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Diagnosis</h2>
              <p className="text-sm">
                Based on the URL parameters, here's what we can determine:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {urlDetails.searchParams?.code && (
                  <li className={`${authCodeValid === true ? "text-green-600" : authCodeValid === false ? "text-red-600" : "text-blue-600"}`}>
                    {authCodeValid === true 
                      ? "✓ Valid Supabase auth code found" 
                      : authCodeValid === false 
                        ? "✗ Invalid or expired Supabase auth code"
                        : "• Supabase auth code found (checking validity...)"}
                  </li>
                )}
                {urlDetails.hashParams?.type === 'recovery' && (
                  <li className="text-green-600">✓ Valid recovery type found in hash fragment</li>
                )}
                {urlDetails.searchParams?.type === 'recovery' && (
                  <li className="text-green-600">✓ Valid recovery type found in query parameters</li>
                )}
                {urlDetails.searchParams?.access_token && (
                  <li className="text-green-600">✓ Access token found in query parameters</li>
                )}
                {urlDetails.hashParams?.access_token && (
                  <li className="text-green-600">✓ Access token found in hash parameters</li>
                )}
                {!urlDetails.hashParams?.type && !urlDetails.searchParams?.type && !urlDetails.searchParams?.code && (
                  <li className="text-red-600">✗ No recovery type or auth code parameter found</li>
                )}
                {!urlDetails.hashParams?.access_token && !urlDetails.searchParams?.access_token && !urlDetails.searchParams?.code && (
                  <li className="text-red-600">✗ No access token or auth code found</li>
                )}
              </ul>
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                variant="default"
                onClick={() => navigate('/reset-password' + location.search + location.hash)}
                disabled={authCodeValid === false}
              >
                Try Password Reset
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/password-reset-help')}
              >
                Go to Help Page
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/auth')}
              >
                Return to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetDebug; 