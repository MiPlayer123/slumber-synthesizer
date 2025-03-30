import { useState } from "react";
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
  ExternalLink 
} from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  
  // Form states
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [exportFormat, setExportFormat] = useState("json");
  
  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingDataExport, setIsLoadingDataExport] = useState(false);

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
      await resetPassword(newPassword);
      
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
                onValueChange={setActiveTab}
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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