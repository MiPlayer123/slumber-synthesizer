
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
      
      if (hasLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('dream_id', dreamId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            dream_id: dreamId,
            user_id: user.id
          });
          
        if (error) throw error;
        return true;
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
