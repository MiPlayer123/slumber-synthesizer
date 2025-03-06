
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDreamLikes = (dreamId: string) => {
  const { user } = useAuth();
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLikes = useCallback(async () => {
    if (!dreamId) return;
    
    try {
      // Get total likes count
      const { data: likesData, error: likesError } = await supabase
        .from('dream_likes')
        .select('id')
        .eq('dream_id', dreamId);
        
      if (likesError) throw likesError;
      
      setLikesCount(likesData?.length || 0);
      
      // Check if current user has liked
      if (user) {
        const { data: userLikeData, error: userLikeError } = await supabase
          .from('dream_likes')
          .select('id')
          .eq('dream_id', dreamId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (userLikeError) throw userLikeError;
        
        setHasLiked(!!userLikeData);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      // Don't show toast for this to avoid spamming the user
    }
  }, [dreamId, user]);

  // Fetch likes when component mounts or dream/user changes
  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  // Toggle like function
  const toggleLike = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to like dreams",
        variant: "destructive"
      });
      return;
    }
    
    if (!dreamId || isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (hasLiked) {
        // Unlike dream
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('dream_id', dreamId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setHasLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: "Dream unliked",
          description: "You have removed your like from this dream"
        });
      } else {
        // Like dream
        const { error } = await supabase
          .from('likes')
          .insert({
            dream_id: dreamId,
            user_id: user.id,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
        
        toast({
          title: "Dream liked",
          description: "You have liked this dream"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update like status',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dreamId, hasLiked, isLoading, toast, user]);

  return {
    likesCount,
    hasLiked,
    toggleLike,
    isLoading,
    refetch: fetchLikes
  };
};
