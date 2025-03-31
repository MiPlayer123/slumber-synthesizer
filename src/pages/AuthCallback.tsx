import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@vercel/analytics/react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processingAuth, setProcessingAuth] = useState(true);
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        setProcessingAuth(true);
        
        // Check if there's a redirect parameter
        const params = new URLSearchParams(location.search);
        const redirectPath = params.get('redirect');
        
        // Attempt to refresh the session to capture the auth state from the redirect
        await refreshSession();
        
        // Track successful authentication
        track('auth_success', { 
          method: 'redirect',
          provider: 'supabase'
        });
        
        // After refreshing session, check if we're authenticated
        if (user) {
          // Navigate to the redirect path if available, otherwise go to journal
          if (redirectPath) {
            navigate(redirectPath, { replace: true });
          } else {
            navigate('/journal', { replace: true });
          }
        } else {
          // Wait a bit longer for auth to complete
          setTimeout(() => {
            if (user) {
              if (redirectPath) {
                navigate(redirectPath, { replace: true });
              } else {
                navigate('/journal', { replace: true });
              }
            } else {
              setError('Unable to complete authentication. Please try again.');
              setTimeout(() => navigate('/auth', { replace: true }), 3000);
            }
          }, 2000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during authentication. Please try again.');
        track('auth_error', { 
          method: 'redirect',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        
        // Redirect back to auth page after showing error
        setTimeout(() => navigate('/auth', { replace: true }), 3000);
      } finally {
        setProcessingAuth(false);
      }
    };
    
    processAuth();
  }, [navigate, user, refreshSession, location.search]);
  
  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-dream">REM</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8">
          {(processingAuth || loading) && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dream-600 mx-auto mb-4"></div>
              <p className="text-dream-600">Completing authentication...</p>
            </div>
          )}
          
          {!processingAuth && !loading && error && (
            <div className="text-center text-red-500">
              <p>{error}</p>
              <p className="mt-2 text-sm">Redirecting you back...</p>
            </div>
          )}
          
          {!processingAuth && !loading && !error && user && (
            <div className="text-center text-green-500">
              <p>Authentication successful!</p>
              <p className="mt-2 text-sm">Redirecting to your journal...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback; 