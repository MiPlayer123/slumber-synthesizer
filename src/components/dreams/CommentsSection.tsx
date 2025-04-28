import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentsSectionProps {
  dreamId: string;
}

export const CommentsSection = ({ dreamId }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchComments = async () => {
      if (!dreamId) return;

      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from("comments")
          .select(
            `
            id,
            content,
            created_at,
            user_id,
            profiles(username, avatar_url)
          `,
          )
          .eq("dream_id", dreamId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Transform the data to match our Comment type
        const formattedComments = data.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          profiles: comment.profiles[0], // Get the first (and only) profile
        }));

        setComments(formattedComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast({
          variant: "destructive",
          title: "Failed to load comments",
          description: "Please try again later",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [dreamId, toast]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          dream_id: dreamId,
          content: newComment.trim(),
          user_id: user.id,
        })
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles(username, avatar_url)
        `,
        )
        .single();

      if (error) throw error;

      // Transform to match our Comment type
      const newCommentData: Comment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        profiles: data.profiles[0], // Get the first (and only) profile
      };

      setComments((prev) => [...prev, newCommentData]);
      setNewComment("");

      // Use React Query's queryClient to invalidate comment count
      if (queryClient) {
        queryClient.invalidateQueries({
          queryKey: ["dream-comments-count", dreamId],
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to post comment",
        description: "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-2 group">
            <ProfileHoverCard username={comment.profiles.username}>
              <Link to={`/profile/${comment.profiles.username}`}>
                <Avatar className="h-7 w-7 flex-shrink-0 transition-opacity hover:opacity-70">
                  {comment.profiles.avatar_url ? (
                    <AvatarImage
                      src={comment.profiles.avatar_url}
                      alt={comment.profiles.username}
                    />
                  ) : (
                    <AvatarFallback>
                      {comment.profiles.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
            </ProfileHoverCard>
            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <ProfileHoverCard username={comment.profiles.username}>
                  <Link to={`/profile/${comment.profiles.username}`}>
                    <span className="font-medium text-sm transition-colors hover:text-muted-foreground">
                      {comment.profiles.username}
                    </span>
                  </Link>
                </ProfileHoverCard>
                <p className="text-sm break-words">{comment.content}</p>
              </div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground space-x-2">
                <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {user && (
        <form onSubmit={handleSubmitComment} className="mt-4 flex items-center">
          <Avatar className="h-7 w-7 mr-2">
            {user.user_metadata?.avatar_url ? (
              <AvatarImage
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.name || user.email}
              />
            ) : (
              <AvatarFallback>
                {(user.email?.charAt(0) || "U").toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-grow border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={!newComment.trim() || isSubmitting}
            className="text-dream-600"
          >
            Post
          </Button>
        </form>
      )}
    </div>
  );
};

export default CommentsSection;
