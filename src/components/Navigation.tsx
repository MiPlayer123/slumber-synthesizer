import { Link, useLocation } from "react-router-dom";
import {
  Moon,
  Sun,
  BookMarked,
  Home,
  Users,
  LogOut,
  User as UserIcon,
  BarChart,
  Settings,
  Grid,
  Menu,
  X,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { track } from "@vercel/analytics/react";

export const Navigation = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

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
        description:
          error instanceof Error ? error.message : "Failed to sign out",
      });
    }
  };

  const handleNavigation = (path: string) => {
    track("navigation_click", {
      path,
      is_mobile: window.innerWidth < 768,
    });
    setIsOpen(false);
  };

  const isLanding = location.pathname === "/";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 w-full z-50 animate-fade-in transition-colors duration-300 ${
        isLanding
          ? "bg-[#1a0b2e] border-[#1a0b2e]"
          : "bg-background/80 dark:bg-background/25 backdrop-blur-lg border-b"
      }`}
      style={
        isLanding
          ? {
              backgroundColor: "#1a0b2e !important",
              borderColor: "#1a0b2e !important",
              boxShadow: "0 0 0 1px #1a0b2e",
            }
          : {}
      }
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to={user ? "/journal" : "/"}
          className="flex items-center space-x-2"
        >
          <span className="text-2xl font-bold text-dream-600">☾ REM</span>
        </Link>

        {/* Desktop Navigation - Now with text labels */}
        <div className="hidden md:flex items-center space-x-1">
          {!user && (
            <Link to="/" onClick={() => handleNavigation("/")}>
              <Button variant="ghost" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/journal" onClick={() => handleNavigation("/journal")}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4" />
                  <span>Journal</span>
                </Button>
              </Link>

              <Link
                to="/statistics"
                onClick={() => handleNavigation("/statistics")}
              >
                <Button variant="ghost" className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  <span>Statistics</span>
                </Button>
              </Link>

              <Link
                to="/dream-wall"
                onClick={() => handleNavigation("/dream-wall")}
              >
                <Button variant="ghost" className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  <span>Dream Wall</span>
                </Button>
              </Link>

              <Link to="/friends" onClick={() => handleNavigation("/friends")}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Friends</span>
                </Button>
              </Link>

              <Link
                to="/settings?tab=subscription"
                onClick={() => handleNavigation("/settings?tab=subscription")}
              >
                <Button variant="ghost" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Subscription</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {user.user_metadata?.avatar_url ? (
                        <AvatarImage
                          src={user.user_metadata.avatar_url}
                          alt={user.user_metadata?.name || user.email || "User"}
                        />
                      ) : (
                        <AvatarFallback>
                          {(user.email?.charAt(0) || "U").toUpperCase()}
                        </AvatarFallback>
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
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/profile/${user.user_metadata?.username}`}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>View Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/settings"
                      onClick={() => handleNavigation("/settings")}
                      className="flex items-center py-2 px-3 text-sm rounded-md hover:bg-accent"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/settings?tab=subscription"
                      onClick={() =>
                        handleNavigation("/settings?tab=subscription")
                      }
                      className="flex items-center py-2 px-3 text-sm rounded-md hover:bg-accent"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Subscription</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/manage-friends"
                      onClick={() => handleNavigation("/manage-friends")}
                      className="flex items-center py-2 px-3 text-sm rounded-md hover:bg-accent"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Manage Friends</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
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
            <Link to="/auth" onClick={() => handleNavigation("/auth")}>
              <Button variant="default">Sign In</Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation - Clean hamburger menu only */}
        <div className="flex md:hidden items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={`w-72 ${isLanding ? "bg-[#1a0b2e] border-[#1a0b2e]" : ""}`}
            >
              <div className="py-4">
                <div className="mb-8 flex items-center">
                  <span className="text-2xl font-bold text-dream-600">
                    ☾ REM
                  </span>
                </div>

                {user ? (
                  <>
                    <div className="flex items-center space-x-3 mb-6">
                      <Avatar className="h-10 w-10">
                        {user.user_metadata?.avatar_url ? (
                          <AvatarImage
                            src={user.user_metadata.avatar_url}
                            alt={
                              user.user_metadata?.name || user.email || "User"
                            }
                          />
                        ) : (
                          <AvatarFallback>
                            {(user.email?.charAt(0) || "U").toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.user_metadata?.name ||
                            user.user_metadata?.username ||
                            user.email ||
                            "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        to="/journal"
                        onClick={() => handleNavigation("/journal")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/journal" ? "bg-accent" : ""}`}
                      >
                        <BookMarked className="mr-3 h-5 w-5" />
                        <span>Journal</span>
                      </Link>
                      <Link
                        to="/statistics"
                        onClick={() => handleNavigation("/statistics")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/statistics" ? "bg-accent" : ""}`}
                      >
                        <BarChart className="mr-3 h-5 w-5" />
                        <span>Statistics</span>
                      </Link>
                      <Link
                        to="/community"
                        onClick={() => handleNavigation("/community")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/community" ? "bg-accent" : ""}`}
                      >
                        <Grid className="mr-3 h-5 w-5" />
                        <span>Community</span>
                      </Link>
                      <Link
                        to="/friends"
                        onClick={() => handleNavigation("/friends")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/friends" ? "bg-accent" : ""}`}
                      >
                        <Users className="mr-3 h-5 w-5" />
                        <span>Friends' Feed</span>
                      </Link>

                      <div className="border-t border-border my-4"></div>

                      <Link
                        to="/profile"
                        onClick={() => handleNavigation("/profile")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/profile" ? "bg-accent" : ""}`}
                      >
                        <UserIcon className="mr-3 h-5 w-5" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => handleNavigation("/settings")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/settings" ? "bg-accent" : ""}`}
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/manage-friends"
                        onClick={() => handleNavigation("/manage-friends")}
                        className={`flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors ${location.pathname === "/manage-friends" ? "bg-accent" : ""}`}
                      >
                        <Users className="mr-3 h-5 w-5" />
                        <span>Manage Friends</span>
                      </Link>
                      <Link
                        to="/settings?tab=subscription"
                        onClick={() =>
                          handleNavigation("/settings?tab=subscription")
                        }
                        className="flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors"
                      >
                        <CreditCard className="mr-3 h-5 w-5" />
                        <span>Subscription</span>
                      </Link>

                      <div className="border-t border-border my-4"></div>

                      <button
                        onClick={() =>
                          setTheme(theme === "dark" ? "light" : "dark")
                        }
                        className="w-full flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors"
                      >
                        {theme === "dark" ? (
                          <>
                            <Sun className="mr-3 h-5 w-5" />
                            <span>Light Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="mr-3 h-5 w-5" />
                            <span>Dark Mode</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors text-red-600 hover:text-red-700"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <Link to="/" onClick={() => handleNavigation("/")}>
                      <div className="flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors">
                        <Home className="mr-3 h-5 w-5" />
                        <span>Home</span>
                      </div>
                    </Link>
                    <Link to="/auth" onClick={() => handleNavigation("/auth")}>
                      <Button className="w-full">Sign In</Button>
                    </Link>
                    <button
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                      className="flex items-center py-3 px-3 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="mr-3 h-5 w-5" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="mr-3 h-5 w-5" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
