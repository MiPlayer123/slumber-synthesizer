import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useCallback, useState } from "react";
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

  // Rest of the hook implementation...
} 