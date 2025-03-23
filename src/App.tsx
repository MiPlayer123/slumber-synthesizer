import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";
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
              {/* Add key prop using pathname to force re-rendering when route changes */}
              <AppRoutes key={location.pathname} />
            </main>
            <Toaster />
            <SpeedInsights 
                sampleRate={1.0} // 100% of users tracked
            />
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
