
import { Link } from "react-router-dom";
import { Moon, Sun, BookMarked, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export const Navigation = () => {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b z-50 animate-fade-in">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-dream-600">REM</span>
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/journal">
            <Button variant="ghost" size="icon">
              <BookMarked className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/community">
            <Button variant="ghost" size="icon">
              <Users className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
};
