import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Link as LinkIcon, ArrowLeft, Loader2, MessageCircle, MessageSquare, Share, Clock, ThumbsUp, ArrowUpDown, X } from "lucide-react";
import { Dream as BaseDream, Profile as ProfileType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DreamCard } from "@/components/dreams/DreamCard";
import { useQueryClient } from '@tanstack/react-query';
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { LikeButton } from "@/components/dreams/LikeButton";
import { CommentButton } from "@/components/dreams/CommentButton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DreamLikeButton } from '@/components/dreams/DreamLikeButton';
import CommentsSection from "@/components/dreams/CommentsSection";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extend the Dream type to include our additional properties
interface ExtendedDream extends BaseDream {
  likeCount?: number;
  commentCount?: number;
}

export const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [dreamsLoading, setDreamsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [dreams, setDreams] = useState<ExtendedDream[]>([]);
  const [selectedDream, setSelectedDream] = useState<ExtendedDream | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [dreamStats, setDreamStats] = useState({
    totalCount: 0,
    publicCount: 0,
    categories: {} as Record<string, number>,
    emotions: {} as Record<string, number>,
  });
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'most-liked' | 'most-commented'>('newest');
  const [sortedDreams, setSortedDreams] = useState<ExtendedDream[]>([]);
  
  // Reference to store the scroll position
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Restore scroll position when returning from a dream
  useEffect(() => {
    const scrollPosition = sessionStorage.getItem(`scroll_${username}`);
    if (scrollPosition && !loading && !dreamsLoading) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPosition));
      }, 100);
      // Clear the stored position after restoration
      sessionStorage.removeItem(`scroll_${username}`);
    }
  }, [username, loading, dreamsLoading]);
  
  // Fetch user profile by username
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        
        // Get the profile by username
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        if (profileData) {
          setProfile(profileData);
          
          // After getting profile, fetch their public dreams
          await fetchPublicDreams(profileData.id);
          
          // Get dream stats
          await fetchDreamStats(profileData.id);
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
    
    fetchProfile();
  }, [username, toast]);

  // Fetch public dreams from the user
  const fetchPublicDreams = async (userId: string) => {
    try {
      setDreamsLoading(true);
      
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
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
      setDreamsLoading(false);
    }
  };
  
  // Fetch dream statistics
  const fetchDreamStats = async (userId: string) => {
    try {
      // Count total dreams (only public ones for other users' profiles)
      const { count: totalCount, error: countError } = await supabase
        .from('dreams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true);
        
      if (countError) throw countError;
      
      // Get categories and emotions distribution (only from public dreams)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('dreams')
        .select('category')
        .eq('user_id', userId)
        .eq('is_public', true);
        
      if (categoriesError) throw categoriesError;
      
      const { data: emotionsData, error: emotionsError } = await supabase
        .from('dreams')
        .select('emotion')
        .eq('user_id', userId)
        .eq('is_public', true);
        
      if (emotionsError) throw emotionsError;
      
      // Process categories and emotions
      const categories: Record<string, number> = {};
      categoriesData.forEach(dream => {
        categories[dream.category] = (categories[dream.category] || 0) + 1;
      });
      
      const emotions: Record<string, number> = {};
      emotionsData.forEach(dream => {
        emotions[dream.emotion] = (emotions[dream.emotion] || 0) + 1;
      });
      
      setDreamStats({
        totalCount: totalCount || 0,
        publicCount: totalCount || 0, // For public profiles, we only show public dreams count
        categories,
        emotions
      });
      
    } catch (error) {
      console.error("Error fetching dream stats:", error);
    }
  };

  // Add comment fetching functionality
  const fetchComments = async (dreamId: string) => {
    if (!dreamId) return;
    
    setIsLoadingComments(true);
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .eq('dream_id', dreamId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load comments',
      });
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Add comment posting functionality
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedDream || !newComment.trim() || isPostingComment) return;
    
    setIsPostingComment(true);
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          dream_id: selectedDream.id,
          user_id: user.id,
          content: newComment.trim(),
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setNewComment('');
      fetchComments(selectedDream.id);
      
      // Invalidate comment count query to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['dream-comments-count', selectedDream.id] });
      
      toast({
        title: "Comment posted",
        description: "Your comment has been added to this dream"
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to post comment',
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle sharing dream
  const handleShareDream = (dreamId: string) => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: 'Link copied',
        description: 'Dream link copied to clipboard!',
      });
    });
  };

  // Handle refreshing likes
  const refreshLikes = (dreamId?: string) => {
    if (dreamId) {
      queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['dream-likes-count'] });
    }
  };

  // Handle dialog open/close
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDream(null);
      refreshLikes();
    }
  };

  // When a dream is clicked
  const handleDreamClick = (dream: ExtendedDream) => {
    // Check if on mobile device (screen width <= 768px)
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Store current scroll position before navigating
      sessionStorage.setItem(`scroll_${username}`, window.scrollY.toString());
      
      // On mobile, navigate directly to the dream detail page
      navigate(`/dream/${dream.id}`, { state: { fromProfile: true } });
    } else {
      // On desktop, show the dialog as before
      setSelectedDream(dream);
      if (dream && dream.id) {
        fetchComments(dream.id);
      }
    }
  };

  // Apply sorting whenever dreams or sort option changes
  useEffect(() => {
    if (!dreams.length) {
      setSortedDreams([]);
      return;
    }

    let sorted = [...dreams];
    
    switch (sortOption) {
      case 'newest':
        sorted = sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted = sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'most-liked':
        // We'll need to fetch like counts for each dream
        fetchDreamLikeCounts(sorted).then((dreamsWithLikes) => {
          setSortedDreams(dreamsWithLikes.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)));
        });
        return; // Early return as we're handling sorting asynchronously
      case 'most-commented':
        // We'll need to fetch comment counts for each dream
        fetchDreamCommentCounts(sorted).then((dreamsWithComments) => {
          setSortedDreams(dreamsWithComments.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0)));
        });
        return; // Early return as we're handling sorting asynchronously
    }
    
    setSortedDreams(sorted);
  }, [dreams, sortOption]);

  // Function to fetch like counts for dreams
  const fetchDreamLikeCounts = async (dreamsList: ExtendedDream[]) => {
    if (!dreamsList.length) return dreamsList;
    
    const dreamsWithLikes = await Promise.all(dreamsList.map(async (dream) => {
      try {
        const { count, error } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('dream_id', dream.id);
          
        if (error) throw error;
        
        return {
          ...dream,
          likeCount: count || 0
        };
      } catch (error) {
        console.error(`Error getting likes for dream ${dream.id}:`, error);
        return {
          ...dream,
          likeCount: 0
        };
      }
    }));
    
    return dreamsWithLikes;
  };

  // Function to fetch comment counts for dreams
  const fetchDreamCommentCounts = async (dreamsList: ExtendedDream[]) => {
    if (!dreamsList.length) return dreamsList;
    
    const dreamsWithComments = await Promise.all(dreamsList.map(async (dream) => {
      try {
        const { count, error } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('dream_id', dream.id);
          
        if (error) throw error;
        
        return {
          ...dream,
          commentCount: count || 0
        };
      } catch (error) {
        console.error(`Error getting comments for dream ${dream.id}:`, error);
        return {
          ...dream,
          commentCount: 0
        };
      }
    }));
    
    return dreamsWithComments;
  };

  // Update the SortSelect component to be more mobile-friendly
  const SortSelect = () => {
    return (
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center">
          <ArrowUpDown className="h-4 w-4 mr-1" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
        </div>
        <Select 
          value={sortOption} 
          onValueChange={(value) => setSortOption(value as typeof sortOption)}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>Newest</span>
              </div>
            </SelectItem>
            <SelectItem value="oldest">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>Oldest</span>
              </div>
            </SelectItem>
            <SelectItem value="most-liked">
              <div className="flex items-center">
                <ThumbsUp className="mr-2 h-4 w-4" />
                <span>Most Liked</span>
              </div>
            </SelectItem>
            <SelectItem value="most-commented">
              <div className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Most Commented</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Add a navigate handler function to properly close the dialog and navigate
  const handleProfileNavigation = (username: string) => {
    // Close the dialog first to avoid it persisting
    setSelectedDream(null);
    // Navigate to the profile
    navigate(`/profile/${username}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">User Not Found</h2>
            <p>The user profile you are looking for does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12" ref={profileRef}>
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-10">{profile.username}'s Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Profile Information - Left Side */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-4 md:mb-6">
                <div className="mb-3 md:mb-4">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.username} />
                    ) : (
                      <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                </div>
                
                <h2 className="text-xl font-bold">{profile.username}</h2>
              </div>
              
              <div className="space-y-4 md:space-y-6">
                {profile.bio && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
                
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {new Date(profile?.created_at || "").toLocaleDateString()}</span>
                  </div>
                  
                  {profile.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline overflow-hidden text-ellipsis break-all"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Dream Stats Card */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle>Dream Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Dreams Shared</h3>
                  <p className="text-2xl font-bold">{dreamStats.publicCount}</p>
                </div>
                
                {Object.keys(dreamStats.categories).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Top Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dreamStats.categories)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([category, count]) => (
                          <span key={category} className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                            {category} ({count})
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                
                {Object.keys(dreamStats.emotions).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Common Emotions</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dreamStats.emotions)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([emotion, count]) => (
                          <span key={emotion} className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                            {emotion} ({count})
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Dreams - Right Side */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex justify-between items-center flex-wrap gap-2">
                <span>{profile?.username}'s Dreams</span>
                {dreams.length > 1 && <SortSelect />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {dreamsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sortedDreams.length > 0 ? (
                <div className="space-y-4 md:space-y-8">
                  {sortedDreams.map(dream => (
                    <DreamListItem 
                      key={dream.id} 
                      dream={dream} 
                      onClick={() => handleDreamClick(dream)}
                      refreshLikes={refreshLikes}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  This user hasn't shared any public dreams yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dream Detail Dialog - Updated to match DreamWall layout with improved animation */}
      <Dialog 
        open={!!selectedDream} 
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent 
          className="max-w-5xl p-0 overflow-hidden bg-background transition-all duration-300 will-change-transform will-change-opacity border-none sm:rounded-none md:rounded-lg"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transform: 'translate3d(-50%, -50%, 0)', // Force GPU acceleration
            // Prevent any white line flashes with a subtle shadow
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
          }}
        >
          {selectedDream && (
            <div className="flex flex-col md:flex-row h-[90vh] md:h-auto overflow-hidden">
              <div className="md:w-3/5 bg-black flex items-center justify-center"
                style={{ 
                  // Ensure smooth rendering of this section
                  willChange: 'contents',
                  transform: 'translateZ(0)'
                }}
              >
                {selectedDream.image_url ? (
                  <img 
                    src={selectedDream.image_url} 
                    alt={selectedDream.title} 
                    className="max-h-[350px] md:max-h-[600px] w-full object-contain"
                  />
                ) : (
                  <div className="w-full h-[350px] md:h-[600px] flex items-center justify-center">
                    <p className="text-muted-foreground">No image available</p>
                  </div>
                )}
              </div>
              
              <div className="md:w-2/5 flex flex-col h-full max-h-[600px] overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.username} />
                        ) : (
                          <AvatarFallback>{(profile?.username?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-medium">{profile?.username}</span>
                    </div>
                    
                    {/* Add mobile-friendly back button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-8 w-8 rounded-full md:hidden"
                      onClick={() => setSelectedDream(null)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 overflow-y-auto flex-grow">
                  <div className="mb-4">
                    <h1 className="text-xl font-bold mb-2">{selectedDream.title}</h1>
                    <p className="text-muted-foreground mb-4">{selectedDream.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedDream.category && (
                        <Badge variant="outline">{selectedDream.category}</Badge>
                      )}
                      {selectedDream.emotion && (
                        <Badge variant="outline">{selectedDream.emotion}</Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedDream.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  {/* Updated comment section to match DreamWall */}
                  <div className="mt-4 border-t pt-4">
                    <div className="mb-4 space-y-4">
                      {isLoadingComments ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-2">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-1/3 mb-2" />
                                <Skeleton className="h-3 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-2">
                          No comments yet. Be the first to comment!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              {comment.profiles?.username && (
                                <ProfileHoverCard username={comment.profiles.username}>
                                  <div 
                                    onClick={() => handleProfileNavigation(comment.profiles.username)}
                                    className="cursor-pointer"
                                  >
                                    <Avatar className="h-7 w-7 flex-shrink-0 transition-opacity hover:opacity-70">
                                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                                      <AvatarFallback>{comment.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </ProfileHoverCard>
                              )}
                              <div>
                                <div className="flex items-baseline gap-1">
                                  {comment.profiles?.username && (
                                    <ProfileHoverCard username={comment.profiles.username}>
                                      <span 
                                        onClick={() => handleProfileNavigation(comment.profiles.username)}
                                        className="font-medium text-sm cursor-pointer transition-colors hover:text-muted-foreground"
                                      >
                                        {comment.profiles?.username || 'Anonymous'}
                                      </span>
                                    </ProfileHoverCard>
                                  )}
                                  <p className="text-sm">{comment.content}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), 'MMM d')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-4 mb-2">
                    {selectedDream && (
                      <DreamLikeButton 
                        dreamId={selectedDream.id} 
                        onSuccess={() => refreshLikes(selectedDream.id)}
                      />
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-0"
                      onClick={() => handleShareDream(selectedDream.id)}
                    >
                      <Share className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  {user && (
                    <form onSubmit={handlePostComment} className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 bg-background text-sm rounded-md border border-input px-3 py-2"
                        style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
                      />
                      <Button 
                        type="submit" 
                        disabled={!newComment.trim() || isPostingComment}
                        size="sm"
                      >
                        Post
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// New component for displaying dreams with like and comment counts
interface DreamListItemProps {
  dream: ExtendedDream;
  onClick: () => void;
  refreshLikes: (dreamId?: string) => void;
}

const DreamListItem: React.FC<DreamListItemProps> = ({ dream, onClick, refreshLikes }) => {
  const { likesCount, hasLiked, toggleLike, isLoading: isLikeLoading } = useDreamLikes(
    dream.id, 
    () => refreshLikes(dream.id)
  );
  
  const { commentCount, isLoading: isCommentCountLoading } = useDreamCommentCount(dream.id);
  
  const handleLikeClick = (e?: React.MouseEvent) => {
    // Ensure we properly handle both with and without event
    if (e) e.stopPropagation();
    toggleLike();
  };
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" 
      onClick={onClick}
    >
      <div className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row items-start">
          {dream.image_url && (
            <div className="sm:mr-4 flex-shrink-0 w-full sm:w-24 h-32 sm:h-24 rounded-md overflow-hidden mb-3 sm:mb-0">
              <img 
                src={dream.image_url} 
                alt={dream.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-bold mb-1">{dream.title}</h3>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">{dream.description}</p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {dream.category && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 md:px-2 md:py-0.5">{dream.category}</Badge>
              )}
              {dream.emotion && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 md:px-2 md:py-0.5">{dream.emotion}</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center gap-2 md:gap-3">
                <div onClick={(e) => e.stopPropagation()}>
                  <LikeButton
                    isLiked={hasLiked}
                    likesCount={likesCount}
                    onClick={handleLikeClick}
                    isLoading={isLikeLoading}
                    showCount={true}
                    className="text-sm"
                  />
                </div>
                
                <div onClick={(e) => e.stopPropagation()}>
                  <CommentButton
                    commentCount={commentCount}
                    isLoading={isCommentCountLoading}
                    onClick={(() => onClick()) as any}
                    className="text-sm"
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {format(new Date(dream.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 