import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics/react';

const ResetPassword = () => {
  const { user, resetPassword, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If no auth flow is active, redirect to sign in
  const hash = window.location.hash;
  const type = new URLSearchParams(hash.substring(1)).get('type');
  
  if (user) {
    return <Navigate to="/journal" replace />;
  }
  
  if (!type || type !== 'recovery') {
    // Not a valid password reset flow
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      track('password_reset_error', { type: 'password_mismatch' });
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      track('password_reset_error', { type: 'password_too_short' });
      return;
    }
    
    try {
      await resetPassword(password);
      track('password_reset_success');
      navigate('/auth');
    } catch (error) {
      track('password_reset_error', { 
        type: 'reset_failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword; 