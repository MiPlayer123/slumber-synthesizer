import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, BookMarked, Home, Users, LogOut, User, BarChart, Settings, Grid, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// Memoized navigation links for better performance
const NavLink = memo(({ 
  to, 
  icon: Icon, 
  label, 
  onClick, 
  isActive 
}: { 
  to: string; 
  icon: React.ElementType; 
  label: string;
  onClick?: () => void;
  isActive: boolean;
}) => (
  <Link to={to} onClick={onClick}>
    <Button 
      variant={isActive ? "secondary" : "ghost"} 
      size="icon" 
      className={isActive ? "bg-dream-100 dark:bg-dream-900" : ""}
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </Button>
  </Link>
));

NavLink.displayName = 'NavLink';

// The main navigation component
export const Navigation = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut, checkSessionStatus } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Get user initials for avatar fallback
  const userInitials = useMemo(() => {
    if (!user?.email) return "U";
    
    const nameParts = user.user_metadata?.full_name?.split(' ') || [];
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    
    return (user.email.charAt(0) || "U").toUpperCase();
  }, [user]);

  // Check if a path is active - prevents unnecessary re-renders
  const isActivePath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Periodically check session status when navigation is mounted
  useEffect(() => {
    if (user) {
      const checkInterval = setInterval(() => {
        checkSessionStatus().catch(err => {
          console.error("Navigation: Session check error:", err);
        });
      }, 15 * 60 * 1000); // Check every 15 minutes
      
      return () => clearInterval(checkInterval);
    }
  }, [user, checkSessionStatus]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await signOut();
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Navigation: Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
      });
    } finally {
      // Close the mobile menu when signing out
      setIsOpen(false);
    }
  };

  // Theme toggle handler
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b z-50 animate-fade-in">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-dream-600">REM</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink to="/" icon={Home} label="Home" isActive={isActivePath('/')} />
          
          {user ? (
            <>
              <NavLink to="/journal" icon={BookMarked} label="Journal" isActive={isActivePath('/journal')} />
              <NavLink to="/statistics" icon={BarChart} label="Statistics" isActive={isActivePath('/statistics')} />
              <NavLink to="/community" icon={Users} label="Community" isActive={isActivePath('/community')} />
              <NavLink to="/dream-wall" icon={Grid} label="Dream Wall" isActive={isActivePath('/dream-wall')} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {user.user_metadata?.avatar_url ? (
                        <AvatarImage 
                          src={user.user_metadata.avatar_url} 
                          alt={user.user_metadata?.name || user.email || "User"} 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.user_metadata?.name || user.email || "Account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="w-full cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default">Login</Button>
            </Link>
          )}
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <div className="flex flex-col h-full pb-4">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-dream-600">REM</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col space-y-4 mt-8">
                  <Link to="/" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start" size="lg">
                      <Home className="h-5 w-5 mr-2" />
                      <span>Home</span>
                    </Button>
                  </Link>
                  
                  {user ? (
                    <>
                      <Link to="/journal" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <BookMarked className="h-5 w-5 mr-2" />
                          <span>Journal</span>
                        </Button>
                      </Link>
                      <Link to="/statistics" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <BarChart className="h-5 w-5 mr-2" />
                          <span>Statistics</span>
                        </Button>
                      </Link>
                      <Link to="/community" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <Users className="h-5 w-5 mr-2" />
                          <span>Community</span>
                        </Button>
                      </Link>
                      <Link to="/dream-wall" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <Grid className="h-5 w-5 mr-2" />
                          <span>Dream Wall</span>
                        </Button>
                      </Link>
                      <Link to="/profile" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <User className="h-5 w-5 mr-2" />
                          <span>Profile</span>
                        </Button>
                      </Link>
                      <Link to="/settings" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <Settings className="h-5 w-5 mr-2" />
                          <span>Settings</span>
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        size="lg"
                        onClick={(e) => {
                          handleSignOut(e);
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      <Button variant="default" className="w-full">Login</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
