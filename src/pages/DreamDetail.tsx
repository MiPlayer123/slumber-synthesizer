import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dream, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Share, ArrowLeft, Loader2, Trash2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DreamLikeButton } from "@/components/dreams/DreamLikeButton";
import { useQueryClient } from "@tanstack/react-query";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubscription } from "@/hooks/use-subscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DreamDetail() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const commentsRef = useRef<HTMLDivElement>(null);
  const fromProfile = location.state?.fromProfile === true;
  const { hasReachedLimit } = useSubscription();

  // Get comment count - move it outside the conditional
  const { commentCount = 0 } = useDreamCommentCount(dreamId || "");

  // Check for analyze parameter and apply free limit check
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldAnalyze = searchParams.get("analyze") === "true";

    if (shouldAnalyze && dreamId && user) {
      // ALWAYS check if user has reached analysis limit, even if they try to bypass UI restrictions
      if (hasReachedLimit("analysis")) {
        toast({
          variant: "destructive",
          title: "Free Limit Reached",
          description:
            "You've reached your free dream analysis limit this week. Upgrade to premium for unlimited analyses.",
        });

        // Remove the analyze parameter from the URL without navigating
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        return;
      }

      // If limit not reached, navigate to journal page with state for analysis
      navigate("/journal", {
        state: {
          fromDreamDetail: true,
          analyzeDreamId: dreamId,
        },
        replace: true, // Replace instead of push to avoid back button issues
      });
    }
  }, [location.search, dreamId, hasReachedLimit, toast, navigate, user]);

  useEffect(() => {
    async function fetchDream() {
      if (!dreamId) return;

      try {
        const { data, error } = await supabase
          .from("dreams")
          .select(
            `
            *,
            profiles:user_id (
              id,
              username,
              avatar_url,
              full_name,
              created_at,
              updated_at
            )
          `,
          )
          .eq("id", dreamId)
          .single();

        if (error) throw error;
        if (data) {
          const dreamWithProfiles: Dream = {
            ...data,
            profiles: data.profiles as Profile,
          };
          setDream(dreamWithProfiles);
        }
      } catch (error) {
        console.error("Error fetching dream:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dream details",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDream();
  }, [dreamId, toast]);

  const fetchComments = useCallback(async () => {
    if (!dreamId) return;

    setIsLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles(username, avatar_url)
        `,
        )
        .eq("dream_id", dreamId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load comments",
      });
    } finally {
      setIsLoadingComments(false);
    }
  }, [dreamId, toast]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !dreamId || !newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);

    try {
      const { error } = await supabase.from("comments").insert({
        dream_id: dreamId,
        user_id: user.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setNewComment("");
      fetchComments();

      // Invalidate comment count query
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", dreamId],
      });

      toast({
        title: "Comment posted",
        description: "Your comment has been added to this dream",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Fetch comments on load
  useEffect(() => {
    if (dreamId && !loading) {
      fetchComments();
    }
  }, [dreamId, loading, fetchComments]);

  // Handle #comments hash in URL
  useEffect(() => {
    // Check if URL has #comments hash and scroll to comments section
    if (location.hash === "#comments" && commentsRef.current && !loading) {
      // Scroll with a slight delay to ensure content is rendered
      setTimeout(() => {
        commentsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [location.hash, loading, comments, isLoadingComments]);

  const handleShareDream = () => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;

    if (navigator.share) {
      navigator
        .share({
          title: dream?.title || "Shared Dream",
          text: dream?.description || "Check out this dream!",
          url: shareUrl,
        })
        .catch((error) => {
          console.error("Error sharing dream:", error);
          copyToClipboard(shareUrl);
        });
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Link copied",
          description: "Dream link copied to clipboard!",
        });
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to copy link",
        });
      });
  };

  const refreshLikes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dream-likes-count"] });
  }, [queryClient]);

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !dreamId || isDeletingComment) return;

    setIsDeletingComment(true);

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Ensure the comment belongs to the current user

      if (error) throw error;

      // Remove comment from local state
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));

      // Invalidate comment count query
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", dreamId],
      });

      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete comment",
      });
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleDeleteDream = async () => {
    if (!user || !dreamId || isDeleting) return;

    if (
      !confirm(
        "Are you sure you want to delete this dream? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      // First delete all comments
      const { error: commentsError } = await supabase
        .from("comments")
        .delete()
        .eq("dream_id", dreamId);

      if (commentsError) throw commentsError;

      // Then delete the dream itself
      const { error } = await supabase
        .from("dreams")
        .delete()
        .eq("id", dreamId)
        .eq("user_id", user.id); // Ensure the dream belongs to the current user

      if (error) throw error;

      toast({
        title: "Dream deleted",
        description: "Your dream has been successfully deleted",
      });

      // Redirect to home page or dreams page
      navigate("/");
    } catch (error) {
      console.error("Error deleting dream:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete dream",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
          <p>
            The dream you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
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
        <div
          className={`md:grid md:grid-cols-5 flex flex-col ${fromProfile ? "md:flex-col" : ""}`}
        >
          <div
            className={`md:col-span-3 ${fromProfile ? "md:h-[350px]" : "h-[350px] md:h-auto"} bg-muted relative`}
          >
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

          <div
            className={`md:col-span-2 p-6 flex flex-col ${fromProfile ? "md:p-4" : ""}`}
          >
            <div className="flex items-center gap-2 mb-4">
              {dream.profiles?.username && (
                <ProfileHoverCard username={dream.profiles.username}>
                  <div
                    className="flex items-center gap-2 transition-opacity hover:opacity-70 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${dream.profiles.username}`);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={dream.profiles.avatar_url || ""} />
                      <AvatarFallback>
                        {dream.profiles.username.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {dream.profiles.username || "Anonymous"}
                    </span>
                  </div>
                </ProfileHoverCard>
              )}
            </div>

            <div className="mb-4">
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
                {format(new Date(dream.created_at), "MMM d, yyyy")}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-4 mb-4">
              {dreamId && (
                <DreamLikeButton dreamId={dreamId} onSuccess={refreshLikes} />
              )}

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleShareDream}
              >
                <Share className="h-5 w-5" />
                <span>Share</span>
              </Button>

              {/* Add Delete Button for Dream Owner */}
              {user && dream.user_id === user.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleDeleteDream}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete Dream"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Comments Section - Always visible */}
            <div id="comments" ref={commentsRef} className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">
                {commentCount > 0 ? `${commentCount} Comments` : "Comments"}
              </p>

              {/* Comment List with ScrollArea */}
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {isLoadingComments ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 w-1/3 mb-2 bg-muted animate-pulse" />
                            <div className="h-3 w-full bg-muted animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group pb-3">
                        {comment.profiles?.username && (
                          <ProfileHoverCard
                            username={comment.profiles.username}
                          >
                            <div
                              className="cursor-pointer transition-opacity hover:opacity-70"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/profile/${comment.profiles.username}`,
                                );
                              }}
                            >
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage
                                  src={comment.profiles?.avatar_url || ""}
                                />
                                <AvatarFallback>
                                  {comment.profiles?.username?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </ProfileHoverCard>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-baseline gap-1">
                              {comment.profiles?.username && (
                                <ProfileHoverCard
                                  username={comment.profiles.username}
                                >
                                  <span
                                    className="font-medium text-sm cursor-pointer transition-colors hover:text-muted-foreground mr-1 leading-normal align-baseline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/profile/${comment.profiles.username}`,
                                      );
                                    }}
                                  >
                                    {comment.profiles?.username || "Anonymous"}
                                  </span>
                                </ProfileHoverCard>
                              )}
                              <span className="text-sm leading-normal align-baseline">
                                {comment.content}
                              </span>
                            </div>

                            {/* Delete option - only shown for user's own comments */}
                            {user && user.id === comment.user_id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-36"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteComment(comment.id)
                                    }
                                    className="text-destructive focus:text-destructive"
                                    disabled={isDeletingComment}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(comment.created_at),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Add Comment Form */}
              <div className="mt-4 pt-4 border-t">
                {user ? (
                  <form
                    onSubmit={handlePostComment}
                    className="flex items-center gap-2 pt-0"
                  >
                    <Avatar className="h-7 w-7">
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
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full bg-background text-sm rounded-md border border-input px-3 py-2"
                        style={{ fontSize: "16px" }} // Prevents iOS zoom on focus
                      />
                      <Button
                        type="submit"
                        disabled={!newComment.trim() || isPostingComment}
                        size="sm"
                      >
                        {isPostingComment ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          "Post"
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-muted-foreground text-sm mb-2">
                      Sign in to leave a comment
                    </p>
                    <Button onClick={() => navigate("/auth")} size="sm">
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
