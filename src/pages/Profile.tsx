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

export const Profile = () => {
  const { user } = useAuth();
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

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

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
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile information",
        });
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

  const updateProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const updates = {
        id: user.id,
        username,
        website,
        bio,
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
      
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL for the avatar
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user!.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update user metadata with the new avatar URL
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      
      if (metadataError) {
        throw metadataError;
      }
      
      // Update local state
      setProfile(prev => prev ? {...prev, avatar_url: publicUrl} : null);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload profile picture",
      });
    } finally {
      setUploading(false);
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-10">My Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Information - Left Side */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Profile</span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <Avatar className="h-24 w-24">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={username} />
                    ) : (
                      <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={uploadAvatar}
                      disabled={uploading}
                      className="sr-only"
                    />
                  </label>
                </div>
                
                <h2 className="text-xl font-bold">{username || "Unknown User"}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              
              {isEditing ? (
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={updateProfile} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {bio && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                      <p className="text-sm">{bio}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Joined {new Date(profile?.created_at || "").toLocaleDateString()}</span>
                    </div>
                    
                    {website && (
                      <div className="flex items-center gap-2 text-sm">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={website.startsWith('http') ? website : `https://${website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {website}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                      Edit Profile
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Dream Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Dreams</span>
                  <span className="font-medium">{dreams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public Dreams</span>
                  <span className="font-medium">{dreams.filter(d => d.is_public).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Private Dreams</span>
                  <span className="font-medium">{dreams.filter(d => !d.is_public).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dreams with Images</span>
                  <span className="font-medium">{dreams.filter(d => d.image_url).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Dreams Display - Right Side */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>My Dreams</CardTitle>
              <CardDescription>
                {dreamLoading ? "Loading your dreams..." : `You have ${dreams.length} dreams recorded`}
              </CardDescription>
              
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'public' | 'private')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Dreams</TabsTrigger>
                  <TabsTrigger value="public">Public</TabsTrigger>
                  <TabsTrigger value="private">Private</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent>
              {dreamLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : getDreamsByFilter().length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No dreams found in this category</p>
                  <Button onClick={() => navigate('/journal')}>Record a New Dream</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              )}
            </CardContent>
            
            {getDreamsByFilter().length > 0 && (
              <CardFooter className="flex justify-center pt-2 pb-6">
                <Button variant="outline" onClick={() => navigate('/journal')}>
                  Record New Dream
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
