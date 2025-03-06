import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dream, Profile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Filter, Search, Sparkles, Wand2, Share } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

// Main component
export default function DreamWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // Add filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  
  // Fetch dreams using React Query
  const { data: dreams = [], isLoading, error } = useQuery({
    queryKey: ['dreams', 'public'],
    queryFn: async () => {
      console.log('Fetching public dreams...');
      const { data, error } = await supabase
        .from('dreams')
        .select(`
          *,
          profiles:user_id (
            id, 
            username,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching dreams:', error);
        throw new Error('Failed to fetch dreams');
      }
      
      console.log('Fetched dreams:', data);
      return data || [];
    },
  });
  
  // Filter dreams based on search and filters
  const filteredDreams = dreams.filter(dream => {
    // Filter by search
    const matchesSearch = searchQuery ? 
      (dream.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       dream.description?.toLowerCase().includes(searchQuery.toLowerCase())) : 
      true;
    
    // Filter by category
    const matchesCategory = categoryFilter ? 
      dream.category === categoryFilter : 
      true;
    
    // Filter by emotion
    const matchesEmotion = emotionFilter ? 
      dream.emotion === emotionFilter : 
      true;
    
    return matchesSearch && matchesCategory && matchesEmotion;
  });

  // Like functionality
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !selectedDream || isLiking) return;
    
    setIsLiking(true);
    
    try {
      console.log('Current user ID:', user.id);
      console.log('Selected dream ID:', selectedDream.id);
      
      if (hasLiked) {
        // Unlike
        console.log('Attempting to unlike dream');
        
        const { error: unlikeError } = await supabase
          .from('likes')
          .delete()
          .match({
            dream_id: selectedDream.id,
            user_id: user.id
          });
          
        if (unlikeError) {
          console.error('Unlike error details:', unlikeError);
          throw new Error(`Failed to unlike: ${unlikeError.message}`);
        }
        
        console.log('Successfully unliked dream');
        
        setSelectedDream({
          ...selectedDream,
          likesCount: Math.max(0, selectedDream.likesCount - 1)
        });
        setHasLiked(false);
        
        toast({
          title: "Dream unliked",
          description: "Your like has been removed"
        });
      } else {
        // Like
        console.log('Attempting to like dream');
        
        const likeObject = {
          dream_id: selectedDream.id,
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        
        console.log('Insert object:', likeObject);
        
        const { error: likeError } = await supabase
          .from('likes')
          .insert(likeObject);
          
        if (likeError) {
          console.error('Like error details:', likeError);
          throw new Error(`Failed to like: ${likeError.message}`);
        }
        
        console.log('Successfully liked dream');
        
        setSelectedDream({
          ...selectedDream,
          likesCount: selectedDream.likesCount + 1
        });
        setHasLiked(true);
        
        toast({
          title: "Dream liked",
          description: "You liked this dream"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Fallback to local only on error
      if (!hasLiked) {
        setSelectedDream({
          ...selectedDream,
          likesCount: selectedDream.likesCount + 1
        });
        setHasLiked(true);
        toast({
          title: "Dream liked",
          description: "You liked this dream (local only)",
          variant: "destructive"
        });
      } else {
        setSelectedDream({
          ...selectedDream,
          likesCount: Math.max(0, selectedDream.likesCount - 1)
        });
        setHasLiked(false);
        toast({
          title: "Dream unliked", 
          description: "Your like has been removed (local only)",
          variant: "destructive"
        });
      }
    } finally {
      setIsLiking(false);
    }
  };

  // Check if user has liked the selected dream
  useEffect(() => {
    if (!selectedDream || !user) return;
    
    const checkLikeStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('dream_id', selectedDream.id)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setHasLiked(!!data);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkLikeStatus();
    fetchComments(selectedDream.id);
  }, [selectedDream, user]);

  // Comments functionality
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

  // Post comment handler
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

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setEmotionFilter('');
  };

  // Share dream
  const handleShareDream = (dreamId: string) => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: 'Link copied',
        description: 'Dream link copied to clipboard!',
      });
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-purple-600">Dream Explorer</h1>
      
      {/* Filters Section */}
      <div className="mb-8 bg-card rounded-lg p-4 shadow-md">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search dreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="p-2">
                <h3 className="font-semibold mb-2">Categories</h3>
                <div className="grid grid-cols-2 gap-1">
                  <Button 
                    variant={categoryFilter === 'Nightmare' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setCategoryFilter(prev => prev === 'Nightmare' ? '' : 'Nightmare')}
                    className="justify-start"
                  >
                    Nightmare
                  </Button>
                  <Button 
                    variant={categoryFilter === 'Lucid' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setCategoryFilter(prev => prev === 'Lucid' ? '' : 'Lucid')}
                    className="justify-start"
                  >
                    Lucid
                  </Button>
                  <Button 
                    variant={categoryFilter === 'Recurring' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setCategoryFilter(prev => prev === 'Recurring' ? '' : 'Recurring')}
                    className="justify-start"
                  >
                    Recurring
                  </Button>
                  <Button 
                    variant={categoryFilter === 'Prophetic' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setCategoryFilter(prev => prev === 'Prophetic' ? '' : 'Prophetic')}
                    className="justify-start"
                  >
                    Prophetic
                  </Button>
                  <Button 
                    variant={categoryFilter === 'Normal' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setCategoryFilter(prev => prev === 'Normal' ? '' : 'Normal')}
                    className="justify-start"
                  >
                    Normal
                  </Button>
                </div>
                
                <h3 className="font-semibold mt-4 mb-2">Emotions</h3>
                <div className="grid grid-cols-2 gap-1">
                  <Button 
                    variant={emotionFilter === 'Joy' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Joy' ? '' : 'Joy')}
                    className="justify-start"
                  >
                    Joy
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Fear' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Fear' ? '' : 'Fear')}
                    className="justify-start"
                  >
                    Fear
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Confusion' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Confusion' ? '' : 'Confusion')}
                    className="justify-start"
                  >
                    Confusion
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Anxiety' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Anxiety' ? '' : 'Anxiety')}
                    className="justify-start"
                  >
                    Anxiety
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Peace' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Peace' ? '' : 'Peace')}
                    className="justify-start"
                  >
                    Peace
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Excitement' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Excitement' ? '' : 'Excitement')}
                    className="justify-start"
                  >
                    Excitement
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Sadness' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Sadness' ? '' : 'Sadness')}
                    className="justify-start"
                  >
                    Sadness
                  </Button>
                  <Button 
                    variant={emotionFilter === 'Neutral' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setEmotionFilter(prev => prev === 'Neutral' ? '' : 'Neutral')}
                    className="justify-start"
                  >
                    Neutral
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Dreams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive text-lg">Error loading dreams</p>
          <p className="text-muted-foreground">{String(error)}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      ) : filteredDreams.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No dreams found</h2>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter || emotionFilter ? 
              "No dreams match your current filters" : 
              "There are no public dreams to display yet"
            }
          </p>
          {(searchQuery || categoryFilter || emotionFilter) && (
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDreams.map((dream) => (
            <DreamTile 
              key={dream.id} 
              dream={dream} 
              onDreamClick={() => setSelectedDream(dream)}
              onShare={() => handleShareDream(dream.id)}
            />
          ))}
        </div>
      )}
      
      {/* Dream Detail Dialog */}
      <Dialog open={!!selectedDream} onOpenChange={(open) => !open && setSelectedDream(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Dream Details</DialogTitle>
          <DialogDescription className="sr-only">View and interact with dream details</DialogDescription>
          
          {selectedDream && (
            <div className="flex flex-col md:flex-row h-[90vh] md:h-auto">
              {/* Left side - Image */}
              <div className="md:w-3/5 bg-black flex items-center justify-center">
                {selectedDream.image_url ? (
                  <img 
                    src={selectedDream.image_url} 
                    alt={selectedDream.title} 
                    className="max-h-[350px] md:max-h-[600px] w-full object-contain"
                  />
                ) : (
                  <div className="w-full h-[350px] md:h-[600px] flex items-center justify-center">
                    <Wand2 className="h-16 w-16 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>
              
              {/* Right side - Content */}
              <div className="md:w-2/5 flex flex-col h-full max-h-[600px] overflow-hidden">
                {/* Header with user info */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedDream.profiles?.avatar_url || ''} />
                      <AvatarFallback>{selectedDream.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedDream.profiles?.username || 'Anonymous'}</span>
                  </div>
                </div>
                
                {/* Dream content */}
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
                  
                  {/* Comments section */}
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
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage src={comment.profiles?.avatar_url || ''} />
                                <AvatarFallback>{comment.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-medium text-sm">{comment.profiles?.username || 'Anonymous'}</span>
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
                
                {/* Actions bar */}
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-4 mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`p-0 ${hasLiked ? 'text-red-500' : ''}`}
                      onClick={handleToggleLike}
                      disabled={isLiking}
                    >
                      <Heart className={`h-6 w-6 ${hasLiked ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-0"
                      onClick={() => handleShareDream(selectedDream.id)}
                    >
                      <Share className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <div className="text-sm font-medium mb-2">
                    {selectedDream.likesCount || 0} likes
                  </div>
                  
                  {/* Comment Form */}
                  {user && (
                    <form onSubmit={handlePostComment} className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 bg-background text-sm rounded-md border border-input px-3 py-2"
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
} 

// DreamTile Component
type DreamTileProps = {
  dream: Dream;
  onDreamClick: () => void;
  onShare: () => void;
};

const DreamTile: React.FC<DreamTileProps> = ({ dream, onDreamClick, onShare }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(dream.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  
  // Check if user has liked this dream
  useEffect(() => {
    if (!user) return;
    
    const checkLikeStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('dream_id', dream.id)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setIsLiked(!!data);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkLikeStatus();
  }, [dream.id, user]);
  
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || isLiking) return;
    
    setIsLiking(true);
    
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({
            dream_id: dream.id,
            user_id: user.id
          });
          
        if (error) throw error;
        
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            dream_id: dream.id,
            user_id: user.id,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update like status',
      });
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onDreamClick}>
      <div className="relative">
        <AspectRatio ratio={4/3}>
          {dream.image_url ? (
            <img 
              src={dream.image_url} 
              alt={dream.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </AspectRatio>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={dream.profiles?.avatar_url || ''} />
            <AvatarFallback>{dream.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{dream.profiles?.username || 'Anonymous'}</span>
        </div>
        
        <h3 className="font-semibold line-clamp-1">{dream.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{dream.description}</p>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {dream.category && (
            <Badge variant="outline" className="text-xs">{dream.category}</Badge>
          )}
          {dream.emotion && (
            <Badge variant="outline" className="text-xs">{dream.emotion}</Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-1 p-0 ${isLiked ? 'text-red-500' : ''}`}
            onClick={handleLikeClick}
            disabled={isLiking}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{likeCount}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 p-0"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0"
          onClick={handleShareClick}
        >
          <Share className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}; 