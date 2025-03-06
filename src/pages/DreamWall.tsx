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
import { MessageCircle, Filter, Search, Sparkles, Wand2, Share } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DreamLikeButton } from '@/components/dreams/DreamLikeButton';
import { LikeButton } from '@/components/dreams/LikeButton';
import { useDreamLikes } from '@/hooks/use-dream-likes';

export default function DreamWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  
  const { 
    likesCount: selectedDreamLikes, 
    hasLiked: selectedDreamHasLiked, 
    toggleLike: toggleSelectedDreamLike, 
    isLoading: isTogglingLike,
    refetch: refetchSelectedDreamLikes
  } = useDreamLikes(selectedDream?.id || '');
  
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
            avatar_url,
            full_name,
            created_at,
            updated_at
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
  
  const filteredDreams = dreams.filter(dream => {
    const matchesSearch = searchQuery ? 
      (dream.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       dream.description?.toLowerCase().includes(searchQuery.toLowerCase())) : 
      true;
    
    const matchesCategory = categoryFilter ? 
      dream.category === categoryFilter : 
      true;
    
    const matchesEmotion = emotionFilter ? 
      dream.emotion === emotionFilter : 
      true;
    
    return matchesSearch && matchesCategory && matchesEmotion;
  });

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

  useEffect(() => {
    if (selectedDream) {
      fetchComments(selectedDream.id);
      refetchSelectedDreamLikes();
    }
  }, [selectedDream, refetchSelectedDreamLikes]);

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

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setEmotionFilter('');
  };

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
      
      <Dialog open={!!selectedDream} onOpenChange={(open) => !open && setSelectedDream(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Dream Details</DialogTitle>
          <DialogDescription className="sr-only">View and interact with dream details</DialogDescription>
          
          {selectedDream && (
            <div className="flex flex-col md:flex-row h-[90vh] md:h-auto">
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
              
              <div className="md:w-2/5 flex flex-col h-full max-h-[600px] overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedDream.profiles?.avatar_url || ''} />
                      <AvatarFallback>{selectedDream.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedDream.profiles?.username || 'Anonymous'}</span>
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
                
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-4 mb-2">
                    <DreamLikeButton dreamId={selectedDream.id} />
                    
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

type DreamTileProps = {
  dream: Dream;
  onDreamClick: () => void;
  onShare: () => void;
};

const DreamTile: React.FC<DreamTileProps> = ({ dream, onDreamClick, onShare }) => {
  const { likesCount, hasLiked, toggleLike, isLoading: isLikeLoading } = useDreamLikes(dream.id);
  
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
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
          <LikeButton 
            isLiked={hasLiked}
            likesCount={likesCount}
            onClick={handleLikeClick}
            isLoading={isLikeLoading}
            showCount={true}
          />
          
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
