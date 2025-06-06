import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { Suspense, lazy, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { HelmetProvider } from "react-helmet-async";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import PasswordResetTroubleshoot from "@/pages/PasswordResetTroubleshoot";
import PasswordResetDebug from "@/pages/PasswordResetDebug";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import { CheckoutComplete } from "@/components/subscription/CheckoutComplete";
import { CheckoutRedirect } from "@/components/subscription/CheckoutRedirect";

// Lazy loaded pages for performance
const Journal = lazy(() => import("@/pages/Journal"));
const Community = lazy(() => import("@/pages/Community"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const DreamWall = lazy(() => import("@/pages/DreamWall"));
const Settings = lazy(() => import("@/pages/Settings"));
const FriendsFeed = lazy(() => import("@/pages/FriendsFeed"));
const ManageFriendsPage = lazy(() => import("@/pages/ManageFriendsPage"));

// Direct imports for public routes and their /app counterparts
import DreamDetail from "@/pages/DreamDetail";
import { UserProfile } from "@/pages/UserProfile";

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
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
};

// Auth handler component to process tokens at root path
const AuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, needsProfileCompletion } = useAuth();

  useEffect(() => {
    // Only run on mount
    const searchParams = new URLSearchParams(location.search);

    console.log("Root path: Checking URL parameters", {
      search: location.search,
      hash: location.hash,
      hasCode: searchParams.has("code"),
      needsProfileCompletion,
      hasUser: !!user,
    });

    // Check if this is a Google sign-in callback
    if (
      searchParams.has("code") &&
      searchParams.has("signin") &&
      searchParams.get("signin") === "google"
    ) {
      console.log("Detected Google sign-in callback, redirecting to auth page");
      navigate("/auth", { replace: true });
      return;
    }

    // Check for explicit password reset flow markers
    const isPasswordReset =
      location.hash.includes("type=recovery") ||
      searchParams.get("type") === "recovery";

    // Check for Supabase auth code (used in the password reset flow)
    if (searchParams.has("code") && isPasswordReset) {
      console.log(
        "Detected Supabase auth code for password reset, redirecting to reset-password with code",
        {
          code: searchParams.get("code"),
        },
      );

      // Redirect to the reset password page with the code parameter
      navigate(`/reset-password${location.search}${location.hash}`, {
        replace: true,
      });
      return;
    }

    // Check for auth-related parameters
    if (
      searchParams.has("error") ||
      searchParams.has("access_token") ||
      searchParams.has("refresh_token") ||
      searchParams.has("token") ||
      searchParams.has("type")
    ) {
      // Check for recovery specifically
      if (
        searchParams.get("type") === "recovery" ||
        location.hash.includes("type=recovery")
      ) {
        console.log("Detected recovery flow, redirecting to reset-password", {
          search: location.search,
          hash: location.hash,
        });

        // Redirect to the reset password page with all query params and hash intact
        navigate(`/reset-password${location.search}${location.hash}`, {
          replace: true,
        });
        return;
      }

      // Check for error related to token expiration
      if (
        searchParams.get("error") === "access_denied" &&
        searchParams.get("error_code") === "otp_expired"
      ) {
        console.log("Detected expired token");
        navigate("/password-reset-troubleshoot?expired=true", {
          replace: true,
        });
        return;
      }
    }

    // If user is logged in but needs profile completion, redirect to auth page
    if (user && !loading && needsProfileCompletion) {
      console.log("User needs profile completion, redirecting to auth page");
      navigate("/auth", { replace: true });
      return;
    }

    // Redirect based on device type if user is logged in and no auth params in URL
    if (user && !loading) {
      const isMobile = window.innerWidth < 768; // Common mobile breakpoint
      console.log("User logged in, redirecting based on device type:", {
        isMobile,
      });
      navigate(isMobile ? "/community" : "/dream-wall", { replace: true });
      return;
    }

    // Otherwise proceed to normal landing page
  }, [location, navigate, user, loading, needsProfileCompletion]);

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
      <Route
        path="/password-reset-troubleshoot"
        element={<PasswordResetTroubleshoot />}
      />
      <Route path="/password-reset-debug" element={<PasswordResetDebug />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Navigate to="/" />} />
      <Route path="/blog" element={<Navigate to="/" />} />

      {/* Public sharing routes - accessible without authentication, using refactored components */}
      {/* These now point to the main components which handle public/app views internally */}
      <Route
        path="/dream/:dreamId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <DreamDetail />
          </Suspense>
        }
      />
      <Route
        path="/profile/:username"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <UserProfile />
          </Suspense>
        }
      />

      {/* App-specific routes (already protected) */}
      {/* The /app suffix is handled by the components themselves to determine view type */}
      <Route
        path="/dream/:dreamId/app"
        element={
          <ProtectedRoute>
            <DreamDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:username/app"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkout-complete"
        element={
          <ProtectedRoute>
            <CheckoutComplete />
          </ProtectedRoute>
        }
      />

      {/* Special route to handle Stripe's malformed URL with & instead of ? */}
      <Route
        path="/checkout-complete&success=true"
        element={
          <ProtectedRoute>
            <CheckoutRedirect />
          </ProtectedRoute>
        }
      />

      {/* Special wildcard route to handle any other malformed checkout URLs */}
      <Route
        path="/checkout-complete/*"
        element={
          <ProtectedRoute>
            <CheckoutRedirect />
          </ProtectedRoute>
        }
      />
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
        path="/dream-wall"
        element={
          <ProtectedRoute>
            <DreamWall />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <FriendsFeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-friends"
        element={
          <ProtectedRoute>
            <ManageFriendsPage />
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
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HelmetProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Navigation />
              <main className="pt-16">
                <AppRoutes />
              </main>
              <Toaster />
            </div>
          </HelmetProvider>
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
