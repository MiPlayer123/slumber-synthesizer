import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Dream, Profile } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { LikeButton } from "@/components/dreams/LikeButton";
import { CommentsSection } from "@/components/dreams/CommentsSection";
import { MessageSquare, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

const Community = () => {
  // Fetch public dreams with their authors
  const { data: publicDreams = [], isLoading } = useQuery({
    queryKey: ['dreams', 'community'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dreams')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Dream & { profiles: Pick<Profile, 'username' | 'avatar_url'> })[];
    },
    // Ensure data is fetched when the component mounts
    refetchOnMount: 'always',
    // Don't rely on stale data when navigating to this page
    staleTime: 0
  });

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dream Community</h1>
      
      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading dreams...</p>
          </div>
        ) : publicDreams?.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-muted-foreground">No public dreams found.</p>
          </div>
        ) : (
          publicDreams?.map((dream) => (
            <DreamCard key={dream.id} dream={dream} />
          ))
        )}
      </div>
    </div>
  );
};

interface DreamCardProps {
  dream: Dream & { profiles: Pick<Profile, 'username' | 'avatar_url'> };
}

function DreamCard({ dream }: DreamCardProps) {
  const queryClient = useQueryClient();
  const refreshLikes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dream.id] });
  }, [queryClient, dream.id]);
  
  const { likesCount, hasLiked, toggleLike, isLoading: isLikeLoading } = useDreamLikes(dream.id, refreshLikes);
  
  // Get the first letter of the username for avatar fallback
  const avatarFallback = dream.profiles.username.charAt(0).toUpperCase();

  const handleLikeClick = () => {
    toggleLike();
  };

  return (
    <Card key={dream.id} className="overflow-hidden border-none shadow-md dark:shadow-lg dark:shadow-slate-700/50">
      {/* Card Header with Author Info */}
      <CardHeader className="flex flex-row items-center justify-between p-4 space-y-0">
        <div className="flex items-center space-x-3">
          <Avatar>
            {dream.profiles.avatar_url && (
              <AvatarImage src={dream.profiles.avatar_url} alt={dream.profiles.username} />
            )}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{dream.profiles.username}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date(dream.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex gap-1">
            <Badge variant="outline">{dream.category}</Badge>
            <Badge variant="outline">{dream.emotion}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      {/* Dream Content */}
      <CardContent className="p-0">
        {/* Dream Title - Moved above the image */}
        <div className="px-4 pt-1 pb-3">
          <h3 className="font-semibold">{dream.title}</h3>
        </div>
        
        {dream.image_url && (
          <div className="relative w-full aspect-video">
            <img
              src={dream.image_url}
              alt={dream.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        
        <div className="p-4">
          {/* Action Buttons */}
          <div className="flex items-center mb-3">
            <LikeButton 
              isLiked={hasLiked}
              likesCount={likesCount}
              onClick={handleLikeClick}
              isLoading={isLikeLoading}
            />
            <Button variant="ghost" size="sm" className="px-2 h-8 hover:bg-transparent">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Like Count */}
          {likesCount > 0 && (
            <p className="font-medium text-sm mb-2">{likesCount} {likesCount === 1 ? 'like' : 'likes'}</p>
          )}
          
          {/* Dream Description */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mt-1">{dream.description}</p>
          </div>
          
          {/* Comments Section */}
          <CommentsSection dreamId={dream.id} />
        </div>
      </CardContent>
    </Card>
  );
}

export default Community;
