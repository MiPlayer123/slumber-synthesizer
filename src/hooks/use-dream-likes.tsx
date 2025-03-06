import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDreamLikes(dreamId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasLiked, setHasLiked] = useState(false);
  
  // Fetch likes count
  const { data: likesCount = 0, isLoading: isLikesLoading } = useQuery({
    queryKey: ['dream-likes-count', dreamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('dream_id', dreamId);
        
      if (error) throw error;
      return count || 0;
    }
  });
  
  // Check if current user has liked this dream
  useEffect(() => {
    if (!user) {
      setHasLiked(false);
      return;
    }
    
    const checkLikeStatus = async () => {
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking like status:', error);
        return;
      }
      
      setHasLiked(!!data);
    };
    
    checkLikeStatus();
  }, [dreamId, user]);
  
  // Toggle like status mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to like dreams');
      
      try {
        if (hasLiked) {
          // Unlike
          const { error: unlikeError } = await supabase
            .from('likes')
            .delete()
            .match({
              dream_id: dreamId,
              user_id: user.id
            });
            
          if (unlikeError) {
            console.error('Error details:', unlikeError);
            
            // Specific handling for permission errors
            if (unlikeError.code === 'PGRST301' || unlikeError.message.includes('permission')) {
              throw new Error('Permission denied: You cannot unlike this dream. Please check your account permissions.');
            }
            
            throw unlikeError;
          }
          
          setHasLiked(false);
          queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
          
          toast({
            title: "Like removed",
            description: "You have removed your like from this dream",
          });
          return false;
        } else {
          // Like
          const { error: likeError } = await supabase
            .from('likes')
            .insert({
              dream_id: dreamId,
              user_id: user.id,
              created_at: new Date().toISOString()
            });
            
          if (likeError) {
            console.error('Error details:', likeError);
            
            // Specific handling for permission errors
            if (likeError.code === 'PGRST301' || likeError.message.includes('permission')) {
              throw new Error('Permission denied: You cannot like this dream. Please check your account permissions.');
            }
            
            // Handle unique constraint violations (already liked)
            if (likeError.code === '23505') {
              throw new Error('You have already liked this dream.');
            }
            
            throw likeError;
          }
          
          setHasLiked(true);
          queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
          
          toast({
            title: "Dream liked",
            description: "You have liked this dream",
          });
          return true;
        }
      } catch (error) {
        console.error('Error toggling like:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error 
            ? error.message 
            : 'Failed to update like status. Please try again later.',
        });
        return false;
      }
    },
    onSuccess: (isLiked) => {
      setHasLiked(isLiked);
      queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
      
      toast({
        title: isLiked ? "Dream liked" : "Like removed",
        description: isLiked 
          ? "You have liked this dream" 
          : "You have removed your like from this dream",
      });
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update like status",
      });
    }
  });
  
  const toggleLike = useCallback(() => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to like dreams",
      });
      return;
    }
    
    toggleLikeMutation.mutate();
  }, [user, toggleLikeMutation, toast]);
  
  return {
    likesCount,
    hasLiked,
    toggleLike,
    isLoading: isLikesLoading || toggleLikeMutation.isPending
  };
}
