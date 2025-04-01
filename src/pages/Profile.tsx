import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Calendar, Link as LinkIcon, Settings, Wand2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Dream, Profile as ProfileType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";

// Create a custom Spinner component until we can import the proper one
const Spinner = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) => {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return <Loader2 className={`animate-spin ${sizeClass} ${className}`} />;
};

// Define form schema
const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  bio: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  email: z.string().email().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const Profile = () => {
  const { user, completeGoogleSignUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [dreamLoading, setDreamLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private'>('all');
  const [activeSection, setActiveSection] = useState<'dreams' | 'settings'>('dreams');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for username setup
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      bio: "",
      website: "",
      email: user?.email || "",
    },
  });

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Load form values when profile is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
        email: user?.email || "",
      });
    }
  }, [profile, user, form]);

  // Fetch user profile
  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          // Initialize with default values for bio and website if they're null
          const profileData: ProfileType = {
            ...data,
            bio: data.bio || "",
            website: data.website || ""
          };
          
          setProfile(profileData);
          setUsername(profileData.username || "");
          setWebsite(profileData.website || "");
          setBio(profileData.bio || "");
          
          // Sync avatar URL to user metadata if they're different
          if (profileData.avatar_url && 
              user.user_metadata?.avatar_url !== profileData.avatar_url) {
            // Update user metadata with the profile avatar URL
            await supabase.auth.updateUser({
              data: { avatar_url: profileData.avatar_url }
            });
          }
          
          // Check if Google user needs username
          const isGoogleUser = user.app_metadata?.provider === 'google';
          const hasUsername = !!profileData.username;
          if (isGoogleUser && !hasUsername) {
            setShowUsernameDialog(true);
          }
        } else {
          // No profile found but user exists
          // Check if Google user
          if (user.app_metadata?.provider === 'google') {
            setShowUsernameDialog(true);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile information",
        });
        
        // If error is "no rows returned", might be a Google user without profile
        if (error instanceof Error && error.message.includes('no rows returned') && 
            user.app_metadata?.provider === 'google') {
          setShowUsernameDialog(true);
        }
      } finally {
        setLoading(false);
      }
    };
    
    getProfile();
  }, [user, toast]);

  // Fetch user's dreams
  useEffect(() => {
    const fetchDreams = async () => {
      if (!user) return;
      
      try {
        setDreamLoading(true);
        
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setDreams(data || []);
      } catch (error) {
        console.error("Error fetching dreams:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dreams",
        });
      } finally {
        setDreamLoading(false);
      }
    };
    
    fetchDreams();
  }, [user, toast]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const updates = {
        id: user.id,
        username: values.username,
        website: values.website,
        bio: values.bio,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from("profiles")
        .upsert(updates, { 
          onConflict: 'id' 
        });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      setUsername(values.username);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError("Username is required");
      return;
    }
    
    try {
      setIsSubmittingUsername(true);
      setUsernameError("");
      
      // Use the existing Auth Context function
      const { success, error } = await completeGoogleSignUp(newUsername);
      
      if (success) {
        toast({
          title: "Username Set",
          description: "Your username has been set successfully!",
        });
        setShowUsernameDialog(false);
        
        // Refresh profile data
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .single();
          
        if (data) {
          const profileData: ProfileType = {
            ...data,
            bio: data.bio || "",
            website: data.website || ""
          };
          
          setProfile(profileData);
          setUsername(profileData.username || "");
        }
      } else if (error) {
        setUsernameError(error.message || "Failed to set username");
      }
    } catch (error) {
      console.error("Error setting username:", error);
      setUsernameError("An unexpected error occurred");
    } finally {
      setIsSubmittingUsername(false);
    }
  };

  const getDreamsByFilter = () => {
    if (activeTab === 'all') return dreams;
    if (activeTab === 'public') return dreams.filter(dream => dream.is_public);
    return dreams.filter(dream => !dream.is_public);
  };

  const handleEditDream = (dreamId: string) => {
    navigate(`/dream/${dreamId}`);
  };

  const handleDeleteDream = async (dreamId: string) => {
    try {
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId);
        
      if (error) throw error;
      
      // Update local state
      setDreams(dreams.filter(dream => dream.id !== dreamId));
      
      toast({
        title: "Dream deleted",
        description: "Your dream has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting dream:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete dream",
      });
    }
  };

  const handleAnalyzeDream = (dreamId: string) => {
    navigate(`/dream/${dreamId}?analyze=true`);
  };

  if (loading && !profile) {
    return (
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{username || user?.email}</h1>
                  {profile?.bio && <p className="text-gray-600 dark:text-gray-400 mt-2">{profile.bio}</p>}
                  {profile?.website && (
                    <a 
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 mt-1 inline-block hover:underline"
                    >
                      {profile.website}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'dreams' | 'settings')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="dreams">Dreams</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="dreams">
                  <div className="mb-4">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'public' | 'private')}>
                      <TabsList>
                        <TabsTrigger value="all">All Dreams</TabsTrigger>
                        <TabsTrigger value="public">Public</TabsTrigger>
                        <TabsTrigger value="private">Private</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {dreamLoading ? (
                    <div className="flex justify-center">
                      <Spinner size="lg" />
                    </div>
                  ) : getDreamsByFilter().length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getDreamsByFilter().map((dream) => (
                        <Card key={dream.id} className="overflow-hidden group">
                          <div className="relative aspect-video bg-muted overflow-hidden">
                            {dream.image_url ? (
                              <img 
                                src={dream.image_url} 
                                alt={dream.title} 
                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                <span className="text-sm text-muted-foreground">No image</span>
                              </div>
                            )}
                            
                            {/* Privacy badge */}
                            <div className="absolute top-2 right-2">
                              <Badge variant={dream.is_public ? "default" : "secondary"}>
                                {dream.is_public ? "Public" : "Private"}
                              </Badge>
                            </div>
                          </div>
                          
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <Link to={`/dream/${dream.id}`} className="hover:underline">
                                <h3 className="font-semibold text-lg line-clamp-1">{dream.title}</h3>
                              </Link>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditDream(dream.id)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  {!dream.enhanced_description && (
                                    <DropdownMenuItem onClick={() => handleAnalyzeDream(dream.id)}>
                                      <Wand2 className="mr-2 h-4 w-4" />
                                      Analyze
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteDream(dream.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {new Date(dream.created_at).toLocaleDateString()}
                            </p>
                            
                            <p className="text-sm line-clamp-2 mb-3">{dream.description}</p>
                            
                            <div className="flex gap-2">
                              <Badge variant="outline">{dream.category}</Badge>
                              <Badge variant="outline">{dream.emotion}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mb-4 text-5xl">😴</div>
                      <h3 className="text-xl font-medium mb-2">No dreams found</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {activeTab === 'all' ? "You haven't recorded any dreams yet." :
                        activeTab === 'public' ? "You haven't shared any dreams publicly." :
                        "You don't have any private dreams."}
                      </p>
                      <Button onClick={() => navigate('/dream/new')}>
                        Record a Dream
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your username"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This is your public username.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us a bit about yourself"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              A brief description for your profile.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://yourwebsite.com"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Your personal website or social media profile.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your email"
                                disabled
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Your email address (cannot be changed).
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2" size="sm" />}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>

      {/* Username Setup Dialog for Google Users */}
      <Dialog open={showUsernameDialog} onOpenChange={(isOpen) => {
        if (profile?.username) {
          setShowUsernameDialog(false);
        } else {
          setShowUsernameDialog(isOpen);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Your Username</DialogTitle>
            <DialogDescription>
              Please choose a username to complete your profile setup.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="col-span-3"
                placeholder="Choose a username"
              />
            </div>
            {usernameError && (
              <p className="text-sm font-medium text-red-500">{usernameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitUsername} disabled={isSubmittingUsername}>
              {isSubmittingUsername ? (
                <>
                  <Spinner className="mr-2" size="sm" />
                  Setting Username...
                </>
              ) : (
                "Set Username"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
