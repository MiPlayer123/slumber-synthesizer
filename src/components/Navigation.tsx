
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Users, BarChart } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className="space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </Link>

            {user && (
              <>
                <Link to="/journal">
                  <Button
                    variant={isActive("/journal") ? "default" : "ghost"}
                    className="space-x-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Journal</span>
                  </Button>
                </Link>
                <Link to="/statistics">
                  <Button
                    variant={isActive("/statistics") ? "default" : "ghost"}
                    className="space-x-2"
                  >
                    <BarChart className="h-4 w-4" />
                    <span>Statistics</span>
                  </Button>
                </Link>
              </>
            )}

            <Link to="/community">
              <Button
                variant={isActive("/community") ? "default" : "ghost"}
                className="space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Community</span>
              </Button>
            </Link>
          </div>

          <div>
            {user ? (
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            ) : (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
