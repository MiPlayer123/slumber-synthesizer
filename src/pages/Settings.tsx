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
  Bell, 
  User, 
  ShieldCheck, 
  PaintBucket, 
  Volume2, 
  Globe, 
  Cloud, 
  HelpCircle, 
  Loader2,
  Moon,
  Sun
} from "lucide-react";

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
  const [isEmailPublic, setIsEmailPublic] = useState(false);
  const [language, setLanguage] = useState("english");
  const [dreamPrivacy, setDreamPrivacy] = useState("private");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dreamReminderNotifications, setDreamReminderNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [recordVoice, setRecordVoice] = useState(true);
  const [dataBackup, setDataBackup] = useState(false);
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
                    value="notifications" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger 
                    value="privacy" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Privacy & Security
                  </TabsTrigger>
                  <TabsTrigger 
                    value="appearance" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <PaintBucket className="mr-2 h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="audio" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Audio & Voice
                  </TabsTrigger>
                  <TabsTrigger 
                    value="language" 
                    className="w-full justify-start px-2 data-[state=active]:bg-muted"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Language
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
            
            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-4 mt-0">
              <Card>
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
              </Card>
            </TabsContent>
            
            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Manage your privacy and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Dream Privacy</h3>
                      <p className="text-sm text-muted-foreground">
                        Default privacy setting for new dreams
                      </p>
                    </div>
                    <Select value={dreamPrivacy} onValueChange={setDreamPrivacy}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Show Email</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow others to see your email address
                      </p>
                    </div>
                    <Switch 
                      checked={isEmailPublic} 
                      onCheckedChange={setIsEmailPublic}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">AI Dream Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to analyze your dreams for personalized insights
                      </p>
                    </div>
                    <Switch 
                      checked={aiAnalysis} 
                      onCheckedChange={setAiAnalysis}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Privacy Settings</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>
                    Manage additional security options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full">Enable Two-Factor Authentication</Button>
                  <Button variant="outline" className="w-full">Manage Connected Devices</Button>
                  <Button variant="destructive" className="w-full">Delete Account</Button>
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
            
            {/* Audio Settings */}
            <TabsContent value="audio" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Audio & Voice Settings</CardTitle>
                  <CardDescription>
                    Configure audio and voice features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Voice Recording</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable voice recording for dream entries
                      </p>
                    </div>
                    <Switch 
                      checked={recordVoice} 
                      onCheckedChange={setRecordVoice}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Language Settings */}
            <TabsContent value="language" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Language Preferences</CardTitle>
                  <CardDescription>
                    Choose your preferred language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Interface Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Spanish</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="german">German</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                        <SelectItem value="chinese">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Language</Button>
                </CardFooter>
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
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-medium">Auto Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically backup your dream data
                      </p>
                    </div>
                    <Switch 
                      checked={dataBackup} 
                      onCheckedChange={setDataBackup}
                    />
                  </div>
                  
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
                    <Button variant="outline" className="justify-start h-auto py-4 px-6">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Documentation</span>
                        <span className="text-sm text-muted-foreground">
                          Read guides and documentation
                        </span>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4 px-6">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Frequently Asked Questions</span>
                        <span className="text-sm text-muted-foreground">
                          Find answers to common questions
                        </span>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4 px-6">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Contact Support</span>
                        <span className="text-sm text-muted-foreground">
                          Get help from our support team
                        </span>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4 px-6">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Privacy Policy</span>
                        <span className="text-sm text-muted-foreground">
                          Read our privacy policy
                        </span>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4 px-6">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Terms of Service</span>
                        <span className="text-sm text-muted-foreground">
                          Read our terms of service
                        </span>
                      </div>
                    </Button>
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