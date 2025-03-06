import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface DreamLikeButtonProps {
  dreamId: string;
  initialLikeCount?: number;
  onLikeChange?: (isLiked: boolean) => void;
}

export const DreamLikeButton = ({ dreamId, initialLikeCount = 0, onLikeChange }: DreamLikeButtonProps) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user || !dreamId) return;
      
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('dream_id', dreamId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!error) {
          setIsLiked(!!data);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkIfLiked();
  }, [dreamId, user]);

  const handleLikeToggle = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (isLiked) {
        // Unlike the dream
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('dream_id', dreamId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        onLikeChange?.(false);
      } else {
        // Like the dream
        const { error } = await supabase
          .from('likes')
          .insert({
            dream_id: dreamId,
            user_id: user.id,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        onLikeChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to like/unlike dream. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="px-2 h-8 hover:bg-transparent"
      onClick={handleLikeToggle}
      disabled={isLoading}
    >
      <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
      {likeCount > 0 && (
        <span className="ml-1">{likeCount}</span>
      )}
    </Button>
  );
};

export default DreamLikeButton; 