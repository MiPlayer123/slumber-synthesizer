import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Profile } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, Share, X, Wand2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { DreamLikeButton } from "@/components/dreams/DreamLikeButton";
import { useFriendsDreams } from "@/hooks/use-dreams"; // Ensure this is the correct hook
import { DreamTile } from "@/components/dreams/DreamTile";
import { useNavigate } from "react-router-dom";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Define the Dream type as expected by DreamTile, including optional 'profiles'
type DisplayDream = Dream & {
  profiles?: Pick<Profile, "id" | "username" | "avatar_url">;
};

export default function FriendsFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedDream, setSelectedDream] = useState<DisplayDream | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data: dreamPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFriendsDreams(user?.id, 20); // Using page size of 20

  const dreams: DisplayDream[] = dreamPages
    ? dreamPages.pages.flatMap((page) => page.dreams)
    : [];

  const refreshLikes = useCallback(
    (dreamId?: string) => {
      if (dreamId) {
        queryClient.invalidateQueries({
          queryKey: ["dream-likes-count", dreamId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["dream-likes-count"] });
      }
      // Also, potentially refresh the friends feed query if likes affect its data directly
      // queryClient.invalidateQueries({ queryKey: ['friendsDreams', user?.id] });
    },
    [queryClient, user?.id],
  );

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
    });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => {
      if (observer) observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const fetchComments = useCallback(
    async (dreamId: string) => {
      if (!dreamId) return;
      setIsLoadingComments(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("comments")
          .select("*, profiles(username, avatar_url)")
          .eq("dream_id", dreamId)
          .order("created_at", { ascending: true });
        if (fetchError) throw fetchError;
        setComments(data || []);
      } catch (err) {
        console.error("Error fetching comments:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load comments",
        });
      } finally {
        setIsLoadingComments(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (selectedDream) {
      fetchComments(selectedDream.id);
    }
  }, [selectedDream, fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDream || !newComment.trim() || isPostingComment)
      return;
    setIsPostingComment(true);
    try {
      const { error: postError } = await supabase.from("comments").insert({
        dream_id: selectedDream.id,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (postError) throw postError;
      setNewComment("");
      fetchComments(selectedDream.id); // Refresh comments
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", selectedDream.id],
      });
      toast({
        title: "Comment posted",
        description: "Your comment has been added.",
      });
    } catch (err) {
      console.error("Error posting comment:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment.",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleShareDream = (dreamId: string) => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Dream link copied to clipboard!",
      });
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDream(null);
      refreshLikes(); // Refresh likes on dialog close, as some might have changed
    }
  };

  const handleProfileNavigation = (username?: string) => {
    if (username) {
      setSelectedDream(null); // Close dialog
      navigate(`/profile/${username}`);
    }
  };

  if (isLoading && dreams.length === 0) {
    return (
      <div className="container mx-auto py-4 px-4 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-purple-600">
          Friends' Activity
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 md:py-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-purple-600">
          Friends' Activity
        </h1>
        <p className="text-destructive text-lg">
          Error loading friends' dreams.
        </p>
        <p className="text-muted-foreground">{error.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() =>
            queryClient.refetchQueries({
              queryKey: ["friendsDreams", user?.id],
            })
          }
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (dreams.length === 0) {
    return (
      <div className="container mx-auto py-4 px-4 md:py-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-purple-600">
          Friends' Activity
        </h1>
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          No Dreams from Friends Yet
        </h2>
        <p className="text-muted-foreground mb-4">
          It looks like your friends haven't shared any dreams, or you haven't
          added any friends yet.
        </p>
        <Button onClick={() => navigate("/community")}>
          Explore Community Dreams
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-purple-600">
        Friends' Activity
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {dreams.map((dream) => (
          <DreamTile
            key={dream.id}
            dream={dream}
            onDreamClick={() => setSelectedDream(dream)}
            onShare={() => handleShareDream(dream.id)}
            refreshLikes={refreshLikes}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="py-6 md:py-8 text-center">
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin mr-2" />
            <span>Loading more dreams...</span>
          </div>
        ) : hasNextPage ? (
          <span className="text-muted-foreground">Scroll to load more</span>
        ) : (
          <span className="text-muted-foreground">
            You've seen all dreams from your friends.
          </span>
        )}
      </div>

      {/* Dream Detail Dialog (similar to DreamWall.tsx) */}
      <Dialog open={!!selectedDream} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-5xl p-0 overflow-hidden bg-background transition-all duration-300 will-change-transform will-change-opacity border-none sm:rounded-none md:rounded-lg"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transform: "translate3d(-50%, -50%, 0)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          }}
        >
          <DialogTitle className="sr-only">Dream Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and interact with dream details
          </DialogDescription>
          {selectedDream && (
            <div className="flex flex-col md:flex-row h-[90vh] md:h-auto overflow-hidden">
              <div
                className="md:w-3/5 bg-black flex items-center justify-center"
                style={{ willChange: "contents", transform: "translateZ(0)" }}
              >
                {selectedDream.image_url ? (
                  <img
                    src={selectedDream.image_url}
                    alt={selectedDream.title}
                    className="max-h-[350px] md:max-h-[600px] w-full object-contain"
                  />
                ) : (
                  <div className="w-full h-[350px] md:h-[600px] flex items-center justify-center">
                    <Wand2 className="h-16 w-16 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>
              <div className="md:w-2/5 flex flex-col h-full max-h-[600px] overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selectedDream.profiles?.username && (
                        <ProfileHoverCard
                          username={selectedDream.profiles.username}
                        >
                          <div
                            onClick={() =>
                              handleProfileNavigation(
                                selectedDream.profiles?.username,
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Avatar className="h-8 w-8 transition-opacity hover:opacity-70">
                              <AvatarImage
                                src={selectedDream.profiles?.avatar_url || ""}
                              />
                              <AvatarFallback>
                                {selectedDream.profiles?.username
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </ProfileHoverCard>
                      )}
                      {selectedDream.profiles?.username && (
                        <ProfileHoverCard
                          username={selectedDream.profiles.username}
                        >
                          <span
                            onClick={() =>
                              handleProfileNavigation(
                                selectedDream.profiles?.username,
                              )
                            }
                            className="font-medium cursor-pointer transition-colors hover:text-muted-foreground"
                          >
                            {selectedDream.profiles?.username || "Anonymous"}
                          </span>
                        </ProfileHoverCard>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8 rounded-full md:hidden"
                      onClick={() => setSelectedDream(null)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto flex-grow">
                  <h1 className="text-xl font-bold mb-2">
                    {selectedDream.title}
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    {selectedDream.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedDream.category && (
                      <Badge variant="outline">{selectedDream.category}</Badge>
                    )}
                    {selectedDream.emotion && (
                      <Badge variant="outline">{selectedDream.emotion}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedDream.created_at), "MMMM d, yyyy")}
                  </p>

                  {/* Comments Section */}
                  <div
                    className="mt-4 border-t pt-4"
                    id="comments-section-in-dialog"
                  >
                    <h3 className="text-lg font-semibold mb-3">Comments</h3>
                    {isLoadingComments ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-1/4 mb-1.5" />
                              <Skeleton className="h-3 w-3/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-2">
                        No comments yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="flex gap-2 items-start"
                          >
                            {comment.profiles?.username && (
                              <ProfileHoverCard
                                username={comment.profiles.username}
                              >
                                <div
                                  onClick={() =>
                                    handleProfileNavigation(
                                      comment.profiles?.username,
                                    )
                                  }
                                  className="cursor-pointer"
                                >
                                  <Avatar className="h-7 w-7 flex-shrink-0 transition-opacity hover:opacity-70">
                                    <AvatarImage
                                      src={comment.profiles?.avatar_url || ""}
                                    />
                                    <AvatarFallback>
                                      {comment.profiles?.username
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </ProfileHoverCard>
                            )}
                            <div>
                              <div className="flex items-baseline gap-1">
                                {comment.profiles?.username && (
                                  <ProfileHoverCard
                                    username={comment.profiles.username}
                                  >
                                    <span
                                      onClick={() =>
                                        handleProfileNavigation(
                                          comment.profiles?.username,
                                        )
                                      }
                                      className="font-medium text-sm cursor-pointer hover:text-muted-foreground"
                                    >
                                      {comment.profiles?.username ||
                                        "Anonymous"}
                                    </span>
                                  </ProfileHoverCard>
                                )}
                                <p className="text-sm text-foreground">
                                  {comment.content}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(comment.created_at),
                                  "MMM d, HH:mm",
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 border-t bg-background">
                  <div className="flex items-center space-x-4 mb-2">
                    <DreamLikeButton
                      dreamId={selectedDream.id}
                      onSuccess={() => refreshLikes(selectedDream.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0"
                      onClick={() => handleShareDream(selectedDream.id)}
                    >
                      <Share className="h-5 w-5" />{" "}
                      <span className="sr-only">Share</span>
                    </Button>
                  </div>
                  {user && (
                    <form
                      onSubmit={handlePostComment}
                      className="flex gap-2 mt-3"
                    >
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 bg-background text-sm rounded-md border border-input px-3 py-2 focus:ring-1 focus:ring-primary"
                        style={{ fontSize: "16px" }}
                      />
                      <Button
                        type="submit"
                        disabled={!newComment.trim() || isPostingComment}
                        size="sm"
                      >
                        {isPostingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Post"
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
