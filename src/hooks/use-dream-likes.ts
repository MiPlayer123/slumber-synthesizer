
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useDreamLikes = (dreamId: string, onSuccess?: () => void) => {
  const { user } = useAuth();
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchLikes = useCallback(async () => {
    if (!dreamId) return;
    
    try {
      // Get total likes count
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .eq('dream_id', dreamId);
        
      if (likesError) throw likesError;
      
      setLikesCount(likesData?.length || 0);
      
      // Check if current user has liked
      if (user) {
        const { data: userLikeData, error: userLikeError } = await supabase
          .from('likes')
          .select('*')
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

  // Setup listener for real-time updates to likes
  useEffect(() => {
    if (!dreamId) return;
    
    // Subscribe to changes on the likes table for this dream
    const channel = supabase
      .channel(`likes-${dreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'likes',
          filter: `dream_id=eq.${dreamId}`
        },
        () => {
          // Refresh likes count and status when any changes occur
          fetchLikes();
        }
      )
      .subscribe();
      
    return () => {
      // Unsubscribe when component unmounts
      supabase.removeChannel(channel);
    };
  }, [dreamId, fetchLikes]);

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
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Invalidate any queries for this dream's likes
      queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
      
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
  }, [dreamId, hasLiked, isLoading, toast, user, onSuccess, queryClient]);

  return {
    likesCount,
    hasLiked,
    toggleLike,
    isLoading,
    refetch: fetchLikes
  };
};
