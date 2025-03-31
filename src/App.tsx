import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, lazy, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics, track } from "@vercel/analytics/react";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { Profile } from "@/pages/Profile";
import ResetPassword from "@/pages/ResetPassword";
import PasswordResetTroubleshoot from "@/pages/PasswordResetTroubleshoot";
import PasswordResetDebug from "@/pages/PasswordResetDebug";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

// Lazy loaded pages for performance
const Journal = lazy(() => import("@/pages/Journal"));
const Community = lazy(() => import("@/pages/Community"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const DreamWall = lazy(() => import("@/pages/DreamWall"));
const DreamDetail = lazy(() => import("@/pages/DreamDetail"));
const Settings = lazy(() => import("@/pages/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dream-600 mb-4"></div>
      <p className="text-dream-600">Loading...</p>
    </div>
  </div>
);

// Protected route component with better loading handling
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Show loading spinner only during initial authentication check
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If not authenticated, redirect to auth page and remember the intended destination
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // Render children wrapped in Suspense for lazy loading
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
};

// Auth handler component to process tokens at root path
const AuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // Only run on mount
    const searchParams = new URLSearchParams(location.search);
    
    console.log("Root path: Checking URL parameters", {
      search: location.search,
      hash: location.hash,
      hasCode: searchParams.has('code')
    });
    
    // Check for Supabase auth code (used in the password reset flow)
    if (searchParams.has('code')) {
      console.log('Detected Supabase auth code, redirecting to reset-password with code', {
        code: searchParams.get('code')
      });
      
      // Redirect to the reset password page with the code parameter
      navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
      return;
    }
    
    // Check for auth-related parameters
    if (searchParams.has('error') || 
        searchParams.has('access_token') || 
        searchParams.has('refresh_token') ||
        searchParams.has('token') ||
        searchParams.has('type')) {
      
      // Check for recovery specifically
      if (searchParams.get('type') === 'recovery' || location.hash.includes('type=recovery')) {
        console.log('Detected recovery flow, redirecting to reset-password', {
          search: location.search,
          hash: location.hash 
        });
        
        // Redirect to the reset password page with all query params and hash intact
        navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
        return;
      }
      
      // Check for error related to token expiration
      if (searchParams.get('error') === 'access_denied' && 
          searchParams.get('error_code') === 'otp_expired') {
        console.log('Detected expired token');
        navigate('/password-reset-troubleshoot?expired=true', { replace: true });
        return;
      }
    }
    
    // Redirect to journal if user is logged in and no auth params in URL
    if (user && !loading) {
      console.log('User already logged in, redirecting to journal');
      navigate('/journal', { replace: true });
      return;
    }
    
    // Otherwise proceed to normal landing page
  }, [location, navigate, user, loading]);
  
  // If still loading auth state, show loading spinner
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Otherwise show the index page
  return <Index />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirectHandler />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/password-reset-troubleshoot" element={<PasswordResetTroubleshoot />} />
      <Route path="/password-reset-debug" element={<PasswordResetDebug />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route 
        path="/journal" 
        element={
          <ProtectedRoute>
            <Journal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/community" 
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/statistics" 
        element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dream-wall" 
        element={
          <ProtectedRoute>
            <DreamWall />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dream/:dreamId" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <DreamDetail />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Create a separate component that uses the router hooks
function AppContent() {
  const location = useLocation();
  
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Navigation />
            <main className="pt-16">
              <AppRoutes />
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <SpeedInsights 
          sampleRate={1.0} // 100% of users tracked
      />
      <Analytics />
    </Router>
  );
}

export default App;
