import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, lazy, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { Profile } from "@/pages/Profile";
import ResetPassword from "@/pages/ResetPassword";

// Lazy loaded pages for performance
const Journal = lazy(() => import("@/pages/Journal"));
const Community = lazy(() => import("@/pages/Community"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const DreamWall = lazy(() => import("@/pages/DreamWall"));
const DreamDetail = lazy(() => import("@/pages/DreamDetail"));
const Settings = lazy(() => import("@/pages/Settings"));

// Create a Query client with robust error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 404s or 401s
        if (
          error instanceof Error && 
          'status' in error && 
          (error.status === 404 || error.status === 401)
        ) {
          return false;
        }
        // Otherwise retry up to 3 times with exponential backoff
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff capped at 30s
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime in v5)
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Custom Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const navigate = useNavigate();
  
  const handleGoHome = () => {
    navigate('/');
    resetErrorBoundary();
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-destructive">Something went wrong</h2>
        <p className="mb-4">We're sorry, but something unexpected happened. Please try again.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
          <button
            onClick={handleGoHome}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Global error logger
const logError = (error: Error, info: { componentStack: string }) => {
  console.error("Error caught by boundary:", error);
  console.error("Component stack:", info.componentStack);
  // In production, you might want to send this to an error tracking service
};

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
  const { user, loading, checkSessionStatus } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const verifySession = async () => {
      if (!user) {
        // If no user is in context, verify session validity
        const valid = await checkSessionStatus();
        if (isMounted && !valid) {
          setChecking(false);
        }
      } else {
        if (isMounted) {
          setChecking(false);
        }
      }
    };
    
    verifySession();
    
    return () => {
      isMounted = false;
    };
  }, [user, checkSessionStatus]);
  
  // Show loading spinner only during initial authentication check
  if (loading || checking) {
    return <LoadingSpinner />;
  }
  
  // If not authenticated, redirect to auth page and remember the intended destination
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  
  // Render children wrapped in ErrorBoundary and Suspense for lazy loading
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
            <DreamDetail />
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
  
  // Global error handler for uncaught errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
      // You could send this to an error tracking service in production
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Navigation />
            <main className="pt-16">
              {/* Add key prop using pathname to force re-rendering when route changes */}
              <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
                <AppRoutes key={location.pathname} />
              </ErrorBoundary>
            </main>
            <Toaster />
            {/* Enable SpeedInsights for production performance monitoring */}
            <SpeedInsights />
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
    </Router>
  );
}

export default App;
