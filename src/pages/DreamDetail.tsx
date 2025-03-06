import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dream, Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Share, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DreamLikeButton } from '@/components/dreams/DreamLikeButton';
import { useQueryClient } from 'react-query';

export default function DreamDetail() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    async function fetchDream() {
      if (!dreamId) return;
      
      try {
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
          .eq('id', dreamId)
          .single();
          
        if (error) throw error;
        if (data) {
          const dreamWithProfiles: Dream = {
            ...data,
            profiles: data.profiles as Profile
          };
          setDream(dreamWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching dream:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load dream details',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchDream();
  }, [dreamId, toast]);
  
  const handleShareDream = () => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    
    if (navigator.share) {
      navigator.share({
        title: dream?.title || 'Shared Dream',
        text: dream?.description || 'Check out this dream!',
        url: shareUrl,
      }).catch(error => {
        console.error('Error sharing dream:', error);
        copyToClipboard(shareUrl);
      });
    } else {
      copyToClipboard(shareUrl);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Link copied',
        description: 'Dream link copied to clipboard!',
      });
    }).catch(err => {
      console.error('Failed to copy link:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link',
      });
    });
  };
  
  const refreshLikes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dream-likes-count'] });
  }, [queryClient]);
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dream-600"></div>
      </div>
    );
  }
  
  if (!dream) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Dream Not Found</h1>
          <p>The dream you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden">
        <div className="md:grid md:grid-cols-5 flex flex-col">
          <div className="md:col-span-3 h-[350px] md:h-auto bg-muted relative">
            {dream.image_url ? (
              <img 
                src={dream.image_url} 
                alt={dream.title} 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={dream.profiles?.avatar_url || ''} />
                <AvatarFallback>{dream.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{dream.profiles?.username || 'Anonymous'}</span>
            </div>
            
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{dream.title}</h1>
              <p className="text-muted-foreground mb-4">{dream.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {dream.category && (
                  <Badge variant="outline">{dream.category}</Badge>
                )}
                {dream.emotion && (
                  <Badge variant="outline">{dream.emotion}</Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {format(new Date(dream.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            
            <div className="mt-auto flex items-center space-x-4">
              {dreamId && <DreamLikeButton dreamId={dreamId} onSuccess={refreshLikes} />}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => navigate(`/dream/${dreamId}#comments`)}
              >
                <MessageCircle className="h-5 w-5" />
                <span>Comments</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1 ml-auto"
                onClick={handleShareDream}
              >
                <Share className="h-5 w-5" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div id="comments" className="p-6 border-t">
          <h2 className="text-xl font-bold mb-4">Comments</h2>
        </div>
      </div>
    </div>
  );
}
