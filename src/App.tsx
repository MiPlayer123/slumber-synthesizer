import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
// Kept imports from dev2 as they are needed
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
      retry: (failureCount, error: any) => { // Added type annotation for error
        // Don't retry on 404s or 401s/403s (auth errors)
        if (
          error &&
          (error?.status === 404 || error?.status === 401 || error?.status === 403)
        ) {
          return false;
        }
        // Otherwise retry up to 2 times (total 3 attempts)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff capped at 30s
      refetchOnWindowFocus: false, // Keep as false if preferred
      refetchOnMount: true, // Refetch data when component mounts
      staleTime: 1000 * 60 * 1, // Data is considered fresh for 1 minute
      gcTime: 1000 * 60 * 10, // Garbage collect inactive data after 10 minutes
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
      retryDelay: 1000,
    },
  },
});

// Custom Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const navigate = useNavigate(); // Hook for navigation

  const handleGoHome = () => {
    navigate('/'); // Navigate to home page
    resetErrorBoundary(); // Reset the error boundary state
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg border border-border">
        <h2 className="text-2xl font-bold mb-4 text-destructive">Something went wrong</h2>
        <p className="mb-2 text-muted-foreground">We're sorry, an unexpected error occurred.</p>
        {/* Optionally display error message in development */}
        {import.meta.env.DEV && (
            <pre className="bg-muted text-muted-foreground p-2 rounded text-xs mb-4 overflow-auto">{error.message}</pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()} // Simple reload
            className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Reload Page
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
  console.error("ErrorBoundary caught:", error, info.componentStack);
  // TODO: Send error to logging service (Sentry, LogRocket, etc.) in production
};

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div> {/* Use primary color */}
      <p className="text-muted-foreground">Loading...</p> {/* Use muted text */}
    </div>
  </div>
);

// Protected route component with better loading handling
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, checkSessionStatus } = useAuth();
  const location = useLocation();
  // Local state to track initial session check if auth context isn't loading
  const [isCheckingSession, setIsCheckingSession] = useState(!user && !authLoading);

  useEffect(() => {
    let isMounted = true;
    if (isCheckingSession) {
      checkSessionStatus().then((isValid) => {
        if (isMounted) {
          // If session becomes valid, auth context will update user state
          // If still invalid, we finish checking
          setIsCheckingSession(false);
        }
      }).catch(() => {
         if (isMounted) setIsCheckingSession(false); // Stop checking on error too
      });
    }
    return () => { isMounted = false; };
  }, [isCheckingSession, checkSessionStatus]);

  // Show loading spinner if auth context is loading OR if we are locally checking session
  if (authLoading || isCheckingSession) {
    return <LoadingSpinner />;
  }

  // If not authenticated after checks, redirect to auth page
  if (!user) {
    console.log("ProtectedRoute: No user found, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render children within Suspense for lazy loading
  // ErrorBoundary here catches errors within the protected route's children
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError} key={location.pathname}>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Component containing the routes configuration
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
      <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dream-wall" element={<ProtectedRoute><DreamWall /></ProtectedRoute>} />
      <Route path="/dream/:dreamId" element={<ProtectedRoute><DreamDetail /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Catch-all Not Found Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Component containing the main app structure and providers
function AppContent() {
  const location = useLocation(); // Use location for ErrorBoundary key if needed

  // Optional: Global error handler for truly uncaught errors (less common with ErrorBoundary)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      console.error("Global error handler caught:", 'reason' in event ? event.reason : event.error);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
        handleGlobalError(event);
    }

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <ThemeProvider> {/* Handles theme switching */}
      <QueryClientProvider client={queryClient}> {/* Provides React Query context */}
        <AuthProvider> {/* Provides Authentication context */}
          <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
            <Navigation /> {/* Persistent navigation bar */}
            <main className="flex-1 pt-16"> {/* pt-16 assumes fixed navbar height */}
              {/* Top-level ErrorBoundary for routing/layout errors */}
              <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError} key={location.pathname}>
                 {/* AppRoutes contains Suspense/ErrorBoundaries for page content */}
                <AppRoutes />
              </ErrorBoundary>
            </main>
            <Toaster /> {/* For displaying toasts/notifications */}
             {/* Speed Insights removed from here, it's placed below */}
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Root Application Component
function App() {
  return (
    <Router> {/* Sets up React Router */}
      <AppContent /> {/* Renders the main content and providers */}
      {/* Vercel Speed Insights - Placed here to wrap the entire routed app */}
      <SpeedInsights
          sampleRate={import.meta.env.PROD ? 0.5 : 1.0} // Sample 50% in prod, 100% in dev
          // route="/" // Optional: Track specific routes if needed
      />
    </Router>
  );
}

export default App;