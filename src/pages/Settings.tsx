import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  PaintBucket, 
  Cloud, 
  Loader2,
  Moon,
  Sun,
  HelpCircle,
  ExternalLink,
  Bell,
  CreditCard,
  CheckCircle,
  Lock,
  ImageIcon,
  Sparkles,
  RefreshCw,
  X,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";

const Settings = () => {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  const { 
    subscription, 
    isLoading: isLoadingSubscription, 
    remainingUsage, 
    startCheckout, 
    refreshSubscription,
    setSubscription
  } = useSubscription();
  const navigate = useNavigate();
  
  // Form states
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [exportFormat, setExportFormat] = useState("json");
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRefreshingSubscription, setIsRefreshingSubscription] = useState(false);
  
  // Notification states (disabled for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dreamReminderNotifications, setDreamReminderNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  
  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingDataExport, setIsLoadingDataExport] = useState(false);

  // Calculate progress percentage for subscription period
  const calculateProgressPercent = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const total = 30 * 24 * 60 * 60 * 1000; // Assume 30 days if we don't know start
    const remaining = end - now;
    // Show percentage remaining of the period
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  // Check for tab parameter and refresh data when needed
  useEffect(() => {
    // Select subscription tab if the URL has a tab parameter
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam && tabParam !== 'notifications') {
      setActiveTab(tabParam);
    }
    
    // Only refresh on initial component mount, not on tab changes or returns to the page
    if (!isLoadingSubscription && !sessionStorage.getItem('initial_load_complete')) {
      // Set flag that we've done the initial load
      sessionStorage.setItem('initial_load_complete', 'true');
      
      // Silently fetch subscription data in background without showing loading spinner
      if (user) {
        refreshSubscription().catch(err => {
          console.error("Error refreshing subscription data:", err);
        });
      }
    }
  }, [refreshSubscription, user]);

  // Remove the session storage when component unmounts to ensure it's fresh on next Settings visit
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('initial_load_complete');
    };
  }, []);

  // Handle form submissions
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProfile(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username,
          full_name: fullName,
          bio,
        }
      });
      
      if (error) throw error;
      
      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          bio,
        })
        .eq('id', user?.id);
      
      if (profileError) throw profileError;
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password fields
    if (!currentPassword) {
      toast({
        variant: "destructive",
        title: "Current Password Required",
        description: "Please enter your current password.",
      });
      return;
    }
    
    if (!newPassword) {
      toast({
        variant: "destructive",
        title: "New Password Required",
        description: "Please enter a new password.",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Your new password and confirmation don't match.",
      });
      return;
    }
    
    setIsLoadingPassword(true);
    
    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        throw new Error('Current password is incorrect');
      }
      
      // Then update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update password",
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };
  
  const handleDataExport = async () => {
    setIsLoadingDataExport(true);
    
    try {
      // Get user's dreams
      const { data: dreams, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      // Create the export file
      const exportData = {
        user: {
          id: user?.id,
          email: user?.email,
          username: user?.user_metadata?.username,
          fullName: user?.user_metadata?.full_name,
        },
        dreams,
        exportDate: new Date().toISOString(),
      };
      
      // Convert to the selected format
      let dataStr;
      let fileName;
      
      if (exportFormat === 'json') {
        dataStr = JSON.stringify(exportData, null, 2);
        fileName = `dream-data-${new Date().toISOString().slice(0, 10)}.json`;
      } else {
        // CSV format
        const headers = ['id', 'title', 'description', 'category', 'emotion', 'is_public', 'created_at'];
        const dreamRows = dreams.map(d => headers.map(h => d[h as keyof typeof d]).join(','));
        dataStr = [headers.join(','), ...dreamRows].join('\n');
        fileName = `dream-data-${new Date().toISOString().slice(0, 10)}.csv`;
      }
      
      // Create download link
      const blob = new Blob([dataStr], { type: exportFormat === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: `Your data has been exported as ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export your data",
      });
    } finally {
      setIsLoadingDataExport(false);
    }
  };

  // Handle subscription checkout
  const handleSubscribe = async () => {
    setIsProcessingPayment(true);
    try {
      await startCheckout(selectedPlan);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: error instanceof Error ? error.message : "Failed to process subscription. Please try again.",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle subscription management
  const handleManageSubscription = async () => {
    if (subscription?.customerPortalUrl) {
      window.location.href = subscription.customerPortalUrl;
    } else {
      // Set up for processing
      setIsRefreshingSubscription(true);
      
      try {
        // Get the current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        if (!accessToken) {
          throw new Error("Authentication required. Please sign in again.");
        }
        
        // First check if we have a subscription_id in the database
        const { data: subData, error: subError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, stripe_customer_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (subError) {
          throw new Error("Could not retrieve subscription information");
        }
        
        if (!subData?.subscription_id && !subData?.stripe_customer_id) {
          throw new Error("No active subscription found to manage");
        }
        
        // Call the API to create a management portal URL
        const response = await fetch('/api/functions/v1/create-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-client-info': 'slumber-synthesizer/1.0.0'
          },
          body: JSON.stringify({
            userId: user.id,
            customerId: subData.stripe_customer_id,
            returnUrl: window.location.origin + '/settings?tab=subscription'
          })
        });
        
        if (!response.ok) {
          // If API call fails, provide a support form fallback
          throw new Error("Could not create management portal. Please contact support.");
        }
        
        const data = await response.json();
        
        if (data?.url) {
          // Store the portal URL for future use
          const { error: updateError } = await supabase
            .from("customer_subscriptions")
            .update({
              customer_portal_url: data.url,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);
          
          if (updateError) {
            console.error("Error updating portal URL:", updateError);
          }
          
          // Redirect to the management portal in the same tab
          window.location.href = data.url;
        } else {
          throw new Error("No management portal URL returned");
        }
      } catch (error) {
        console.error("Error managing subscription:", error);
        
        // Fallback to support form
        const supportFormUrl = "https://forms.gle/aMFrfqbqiMMBSEKr9";
        
        toast({
          variant: "destructive",
          title: "Portal Unavailable",
          description: error instanceof Error 
            ? error.message 
            : "Customer portal link is not available. We'll redirect you to contact support.",
        });
        
        // Short delay before redirecting
        setTimeout(() => {
          window.location.href = supportFormUrl;
        }, 1500);
      } finally {
        setIsRefreshingSubscription(false);
      }
    }
  };

  // Handle subscription refresh
  const handleRefreshSubscription = async () => {
    setIsRefreshingSubscription(true);
    try {
      await refreshSubscription();
      toast({
        title: "Subscription Refreshed",
        description: "Your subscription status has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh your subscription status.",
      });
    } finally {
      setIsRefreshingSubscription(false);
    }
  };

  // Prevent switching to the notifications tab
  const handleTabChange = (value: string) => {
    if (value !== 'notifications') {
      setActiveTab(value);
    } else {
      // Optionally show a toast to inform the user
      toast({
        title: "Coming Soon",
        description: "Notification preferences will be available in a future update.",
      });
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (subscription?.customerPortalUrl) {
      // First update the database to set cancel_at_period_end = true but keep status as "active"
      // This ensures we show the right status even before the webhook updates it
      try {
        setIsRefreshingSubscription(true);
        // Try with the cancel_at_period_end column
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            // Keep status as "active" since subscription is still usable until period end
            status: "active", 
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
          
        if (updateError) {
          console.error("Error updating subscription for cancellation:", updateError);
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update subscription status before redirecting to Stripe."
          });
        } else {
          console.log("Successfully updated subscription with cancel_at_period_end=true");
          
          // Show notification to user
          toast({
            title: "Subscription Canceling",
            description: "Your subscription will remain active until the end of the billing period.",
            variant: "default"
          });
          
          // Refresh subscription data to update the UI
          await refreshSubscription();
        }
      } catch (dbError) {
        console.error("Error updating database before redirect:", dbError);
      } finally {
        setIsRefreshingSubscription(false);
      }
      
      // Redirect to portal after updating database
      window.location.href = subscription.customerPortalUrl;
    } else {
      // Set up for processing
      setIsRefreshingSubscription(true);
      
      try {
        // Get the current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        if (!accessToken) {
          throw new Error("Authentication required. Please sign in again.");
        }
        
        // First check if we have a subscription_id in the database
        const { data: subData, error: subError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, stripe_customer_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (subError) {
          throw new Error("Could not retrieve subscription information");
        }
        
        if (!subData?.stripe_customer_id) {
          throw new Error("No active subscription found to cancel");
        }
        
        // If we don't have a subscription_id but have customer_id, retrieve it from Stripe
        if (!subData.subscription_id && subData.stripe_customer_id) {
          console.log("Missing subscription ID, fetching from Stripe...");
          
          // Call the get-stripe-subscription endpoint to retrieve and store the subscription ID
          const fetchResponse = await fetch('/api/functions/v1/get-stripe-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-client-info': 'slumber-synthesizer/1.0.0'
            },
            body: JSON.stringify({
              userId: user.id,
              stripeCustomerId: subData.stripe_customer_id
            })
          });
          
          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.text();
            console.error("Failed to fetch subscription ID:", fetchResponse.status, errorData);
          } else {
            // Successfully fetched subscription ID, refresh data
            const fetchData = await fetchResponse.json();
            console.log("Retrieved subscription ID:", fetchData.subscription_id);
          }
        }
        
        // Call the API to create a management portal URL
        console.log("Calling create-portal API with customer ID:", subData.stripe_customer_id);
        const response = await fetch('/api/functions/v1/create-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-client-info': 'slumber-synthesizer/1.0.0'
          },
          body: JSON.stringify({
            userId: user.id,
            customerId: subData.stripe_customer_id,
            returnUrl: window.location.origin + '/settings?tab=subscription'
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Create portal API error:", response.status, errorText);
          
          // Check for specific Stripe configuration error
          if (errorText.includes("No configuration provided") || errorText.includes("portal settings")) {
            toast({
              variant: "destructive",
              title: "Stripe Portal Not Configured",
              description: "The Stripe Customer Portal hasn't been set up yet. Please contact support.",
            });
            
            // Open support form after a short delay
            setTimeout(() => {
              window.location.href = "https://forms.gle/aMFrfqbqiMMBSEKr9";
            }, 1500);
            
            return;
          }
          
          // As a fallback for other errors, try to use customer support link
          const supportUrl = "https://billing.stripe.com/p/login/test_3cs8xSc4bcCt9aw9AA";
          toast({
            title: "Using Alternate Portal",
            description: "We'll redirect you to the Stripe billing portal directly.",
          });
          
          setTimeout(() => {
            window.location.href = supportUrl;
          }, 1000);
          
          return;
        }
        
        const data = await response.json();
        
        if (data?.url) {
          // Store the portal URL for future use
          const { error: updateError } = await supabase
            .from("customer_subscriptions")
            .update({
              customer_portal_url: data.url,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);
          
          if (updateError) {
            console.error("Error updating portal URL:", updateError);
          }
          
          // Redirect to the management portal in the same tab
          window.location.href = data.url;
        } else {
          throw new Error("No management portal URL returned");
        }
      } catch (error) {
        console.error("Error canceling subscription:", error);
        
        // Fallback to support form
        const supportFormUrl = "https://forms.gle/aMFrfqbqiMMBSEKr9";
        
        toast({
          variant: "destructive",
          title: "Portal Unavailable",
          description: error instanceof Error 
            ? error.message 
            : "Customer portal link is not available. We'll redirect you to contact support.",
        });
        
        // Short delay before redirecting
        setTimeout(() => {
          window.location.href = supportFormUrl;
        }, 1500);
      } finally {
        setIsRefreshingSubscription(false);
      }
    }
  };

  const renewSubscription = async () => {
    if (subscription?.customerPortalUrl) {
      // First update the database to remove cancellation status
      try {
        // Try with the cancel_at_period_end column
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            status: "active",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
          
        if (updateError) {
          console.error("Error updating subscription status to active:", updateError);
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update subscription status before redirecting to Stripe."
          });
        } else {
          console.log("Successfully updated subscription status to active in database");
        }
      } catch (dbError) {
        console.error("Error updating database before redirect:", dbError);
      }
      
      // If portal URL is available, open it in the same tab
      window.location.href = subscription.customerPortalUrl;
    } else {
      // Handle same as manage subscription if portal URL isn't available
      handleManageSubscription();
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64">
          <Card>
            <CardContent className="p-4">
              <Tabs 
                defaultValue="account" 
                orientation="vertical" 
                value={activeTab} 
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="flex flex-col items-start h-auto bg-transparent border-r space-y-1">
                  <TabsTrigger 
                    value="account" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger 
                    value="subscription" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="w-full justify-start px-2 text-muted-foreground hover:text-muted-foreground cursor-not-allowed"
                    disabled
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    <span className="ml-2 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">Soon</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="appearance" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <PaintBucket className="mr-2 h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="data" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <Cloud className="mr-2 h-4 w-4" />
                    Data & Backup
                  </TabsTrigger>
                  <TabsTrigger 
                    value="help" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Account Settings */}
            <TabsContent value="account" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="flex items-center space-x-4 mb-6">
                      <Avatar className="h-20 w-20">
                        {user?.user_metadata?.avatar_url ? (
                          <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata?.name || user.email || "User"} />
                        ) : (
                          <AvatarFallback className="text-lg">{(user?.email?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <Button variant="outline">Change Avatar</Button>
                    </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        disabled 
                      />
                      <p className="text-sm text-muted-foreground">
                        Your email cannot be changed
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input 
                        id="bio" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Tell others a bit about yourself"
                      />
                    </div>
                    
                    <Button type="submit" disabled={isLoadingProfile}>
                      {isLoadingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input 
                        id="currentPassword" 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                    
                    <Button type="submit" disabled={isLoadingPassword}>
                      {isLoadingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating
                        </>
                      ) : 'Update Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Subscription Settings */}
            <TabsContent value="subscription" className="space-y-4 mt-0">
              {isLoadingSubscription ? (
                <Card>
                  <CardContent className="p-8 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </CardContent>
                </Card>
              ) : subscription?.status === "active" ? (
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="space-y-1 flex-1">
                      <CardTitle>Premium Subscription</CardTitle>
                      <CardDescription>
                        {subscription?.displayStatus === "active" ? 
                          "Your premium subscription is active." :
                          subscription?.displayStatus === "canceling" ? 
                          "Your subscription will remain active until the end of the billing period." :
                          "Your subscription is inactive."
                        }
                      </CardDescription>
                    </div>
                    {subscription?.displayStatus === "active" && (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500 hover:bg-green-500/30">Active</Badge>
                    )}
                    {subscription?.displayStatus === "canceling" && (
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500 hover:bg-amber-500/30">Canceling</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {subscription?.displayStatus === "canceling" ? "Ends" : "Renews"}
                        </span>
                        <span>
                          {subscription?.currentPeriodEnd ? 
                            new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div 
                          className={`h-full rounded-full ${
                            subscription?.displayStatus === "canceling" 
                              ? "bg-amber-500/70" 
                              : "bg-primary/70"
                          }`} 
                          style={{ 
                            width: subscription?.currentPeriodEnd ? 
                              `${Math.max(5, calculateProgressPercent(subscription.currentPeriodEnd))}%` : 
                              '0%' 
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-primary/5 p-4 rounded-lg flex items-center">
                        <ImageIcon className="h-5 w-5 mr-3 text-primary" />
                        <div>
                          <h3 className="font-medium">Image Generation</h3>
                          <p className="text-sm text-muted-foreground">Unlimited</p>
                        </div>
                      </div>
                      
                      <div className="bg-primary/5 p-4 rounded-lg flex items-center">
                        <Sparkles className="h-5 w-5 mr-3 text-primary" />
                        <div>
                          <h3 className="font-medium">Dream Analysis</h3>
                          <p className="text-sm text-muted-foreground">Unlimited</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Button 
                        onClick={handleManageSubscription} 
                        variant="outline"
                        className="sm:flex-1"
                        disabled={isRefreshingSubscription}
                      >
                        {isRefreshingSubscription ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Manage Billing
                          </>
                        )}
                      </Button>
                      
                      {subscription?.displayStatus === "canceling" ? (
                        <Button 
                          onClick={renewSubscription} 
                          variant="default"
                          className="sm:flex-1"
                          disabled={isRefreshingSubscription}
                        >
                          {isRefreshingSubscription ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Renew Subscription
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          onClick={cancelSubscription} 
                          variant="destructive"
                          className="sm:flex-1"
                          disabled={isRefreshingSubscription}
                        >
                          {isRefreshingSubscription ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Subscription
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    <div className="border-t pt-4 mt-2">
                      <h3 className="text-sm font-medium mb-2">Premium Benefits:</h3>
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Unlimited dream analysis
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Unlimited image generation
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Priority support
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Subscription Plans</CardTitle>
                      <CardDescription>
                        Upgrade to unlock unlimited dream analysis and image generation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Monthly Plan */}
                        <Card 
                          className={`border-2 cursor-pointer hover:border-primary transition-colors ${selectedPlan === 'monthly' ? 'border-primary' : 'border-muted'}`}
                          onClick={() => setSelectedPlan('monthly')}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Monthly Plan</CardTitle>
                            <CardDescription>Perfect for regular dreamers</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline mb-4">
                              <span className="text-3xl font-bold">$6</span>
                              <span className="text-sm text-muted-foreground ml-1">/month</span>
                            </div>
                            <ul className="space-y-2">
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Unlimited dream analysis
                              </li>
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Unlimited image generation
                              </li>
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Priority support
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                        
                        {/* 6-Month Plan */}
                        <Card 
                          className={`border-2 cursor-pointer hover:border-primary transition-colors ${selectedPlan === '6-month' ? 'border-primary' : 'border-muted'}`}
                          onClick={() => setSelectedPlan('6-month')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">6-Month Plan</CardTitle>
                                <CardDescription>Best value</CardDescription>
                              </div>
                              <div className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-semibold">
                                Save 17%
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-baseline mb-4">
                              <span className="text-3xl font-bold">$30</span>
                              <span className="text-sm text-muted-foreground ml-1">/6 months</span>
                            </div>
                            <ul className="space-y-2">
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Unlimited dream analysis
                              </li>
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Unlimited image generation
                              </li>
                              <li className="flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                Priority support
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Button 
                        onClick={handleSubscribe} 
                        disabled={isProcessingPayment} 
                        className="w-full"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing
                          </>
                        ) : (
                          <>
                            Subscribe Now
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Free Plan Limits</CardTitle>
                      <CardDescription>
                        Your current usage on the free plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium">Image Generations</span>
                            </div>
                            <span className="text-sm font-semibold">
                              {remainingUsage?.imageGenerations || 0} / 3 remaining this week
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-primary rounded-full transition-all`}
                              style={{ width: `${((remainingUsage?.imageGenerations || 0) / 3) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium">Dream Analyses</span>
                            </div>
                            <span className="text-sm font-semibold">
                              {remainingUsage?.dreamAnalyses || 0} / 3 remaining this week
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-primary rounded-full transition-all`}
                              style={{ width: `${((remainingUsage?.dreamAnalyses || 0) / 3) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Free plan limits reset every Sunday at midnight UTC.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            {/* Notifications Settings - Disabled but shown for future reference */}
            <TabsContent value="notifications" className="space-y-4 mt-0">
              <Card className="opacity-70 pointer-events-none">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications about your account and dreams
                      </p>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Push Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications on your devices
                      </p>
                    </div>
                    <Switch 
                      checked={pushNotifications} 
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Dream Reminders</h3>
                      <p className="text-sm text-muted-foreground">
                        Get reminders to record your dreams in the morning
                      </p>
                    </div>
                    <Switch 
                      checked={dreamReminderNotifications} 
                      onCheckedChange={setDreamReminderNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Comment Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone comments on your shared dreams
                      </p>
                    </div>
                    <Switch 
                      checked={commentNotifications} 
                      onCheckedChange={setCommentNotifications}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Preferences</Button>
                </CardFooter>
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
                  <div className="bg-background border rounded-lg p-4 text-center shadow-lg">
                    <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">Notification preferences will be available in a future update.</p>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Appearance</CardTitle>
                  <CardDescription>
                    Customize how REM looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Theme Mode</Label>
                    <div className="flex gap-4">
                      <Button 
                        variant={theme === "light" ? "default" : "outline"} 
                        onClick={() => setTheme("light")}
                        className="flex-1"
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </Button>
                      <Button 
                        variant={theme === "dark" ? "default" : "outline"} 
                        onClick={() => setTheme("dark")}
                        className="flex-1"
                      >
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Data & Backup Settings */}
            <TabsContent value="data" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Data & Backup</CardTitle>
                  <CardDescription>
                    Manage your data and backups
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="export">Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleDataExport} 
                    disabled={isLoadingDataExport} 
                    className="w-full"
                  >
                    {isLoadingDataExport ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting Data
                      </>
                    ) : 'Export Dreams Data'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Help & Support */}
            <TabsContent value="help" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Help & Support</CardTitle>
                  <CardDescription>
                    Find help and support resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <Link to="/privacy">
                      <Button variant="outline" className="justify-start h-auto py-4 px-6 w-full">
                        <div className="flex flex-col items-start">
                          <span className="font-medium flex items-center">
                            Privacy Policy
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Read our privacy policy
                          </span>
                        </div>
                      </Button>
                    </Link>
                    
                    <Link to="/terms">
                      <Button variant="outline" className="justify-start h-auto py-4 px-6 w-full">
                        <div className="flex flex-col items-start">
                          <span className="font-medium flex items-center">
                            Terms of Service
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Read our terms of service
                          </span>
                        </div>
                      </Button>
                    </Link>
                    
                    <a href="https://forms.gle/aMFrfqbqiMMBSEKr9" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="justify-start h-auto py-4 px-6 w-full">
                        <div className="flex flex-col items-start">
                          <span className="font-medium flex items-center">
                            Contact Support
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Get help from our support team
                          </span>
                        </div>
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings; 