import { Link } from "react-router-dom";
import { Moon, Sun, BookMarked, Home, Users, LogOut, User, BarChart, Settings, Grid, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
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

export const Navigation = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b z-50 animate-fade-in">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-dream-600">REM</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          
          {user ? (
            <>
              <Link to="/journal">
                <Button variant="ghost" size="icon">
                  <BookMarked className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/statistics">
                <Button variant="ghost" size="icon">
                  <BarChart className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/community">
                <Button variant="ghost" size="icon">
                  <Users className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dream-wall">
                <Button variant="ghost" size="icon">
                  <Grid className="h-5 w-5" />
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {user.user_metadata?.avatar_url ? (
                        <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata?.name || user.email || "User"} />
                      ) : (
                        <AvatarFallback>{(user.email?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.user_metadata?.name || user.email || "My Account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default">Sign In</Button>
            </Link>
          )}
          
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

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center space-x-3">
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

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pt-10">
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
                      <span>Log out</span>
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="default" className="w-full">Sign In</Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
