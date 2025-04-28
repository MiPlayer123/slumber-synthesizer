import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Comment {
  id: string;
  dream_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export function useDreamComments(dreamId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  // Fetch comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["dream-comments", dreamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles:user_id(username, avatar_url)
        `,
        )
        .eq("dream_id", dreamId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as Comment[]) || [];
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("You must be logged in to comment");
      if (!content.trim()) throw new Error("Comment cannot be empty");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          dream_id: dreamId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setCommentText("");
      // Invalidate both comments and comment count queries
      queryClient.invalidateQueries({ queryKey: ["dream-comments", dreamId] });
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", dreamId],
      });

      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add comment",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error("You must be logged in to delete a comment");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
      return commentId;
    },
    onSuccess: () => {
      // Invalidate both comments and comment count queries
      queryClient.invalidateQueries({ queryKey: ["dream-comments", dreamId] });
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", dreamId],
      });

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete comment",
      });
    },
  });

  const addComment = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to comment",
      });
      return;
    }

    addCommentMutation.mutate(commentText);
  };

  const deleteComment = (commentId: string) => {
    if (!user) return;
    deleteCommentMutation.mutate(commentId);
  };

  return {
    comments,
    commentText,
    setCommentText,
    addComment,
    deleteComment,
    isLoading:
      isCommentsLoading ||
      addCommentMutation.isPending ||
      deleteCommentMutation.isPending,
    isAddingComment: addCommentMutation.isPending,
  };
}

export function useDreamCommentCount(dreamId: string) {
  // Fetch comment count only
  const { data: commentCount = 0, isLoading } = useQuery({
    queryKey: ["dream-comments-count", dreamId],
    queryFn: async () => {
      if (!dreamId) return 0;

      const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("dream_id", dreamId);

      if (error) throw error;
      return count || 0;
    },
    // Use shorter stale time to refresh data more frequently
    staleTime: 1000 * 10, // 10 seconds
  });

  return {
    commentCount,
    isLoading,
  };
}

export type { Comment };
