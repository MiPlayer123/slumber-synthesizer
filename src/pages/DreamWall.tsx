import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Filter,
  Search,
  Sparkles,
  Wand2,
  Share,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { DreamLikeButton } from "@/components/dreams/DreamLikeButton";
import { LikeButton } from "@/components/dreams/LikeButton";
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { usePublicDreams } from "@/hooks/use-dreams";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { CommentButton } from "@/components/dreams/CommentButton";
import { useNavigate } from "react-router-dom";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";

export default function DreamWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("");

  // Reference for infinite scrolling

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Use the paginated public dreams hook
  const {
    data: dreamPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicDreams(20);

  // Extract all dreams from pages
  const dreams = dreamPages
    ? dreamPages.pages.flatMap((page) => page.dreams)
    : [];

  const refreshLikes = useCallback(
    (dreamId?: string) => {
      if (dreamId) {
        // Invalidate a specific dream's likes
        queryClient.invalidateQueries({
          queryKey: ["dream-likes-count", dreamId],
        });
      } else {
        // Invalidate all likes (fallback)
        queryClient.invalidateQueries({ queryKey: ["dream-likes-count"] });
      }
    },
    [queryClient],
  );

  const { refetch: refetchSelectedDreamLikes } = useDreamLikes(
    selectedDream?.id || "",
    refreshLikes,
  );

  // Setup intersection observer for infinite scrolling
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

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredDreams = dreams.filter((dream) => {
    // Safely check if dream object and its properties exist
    if (!dream) return false;

    // Handle search query filtering with null/undefined checks
    const matchesSearch = !searchQuery
      ? true
      : dream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dream.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Handle category filtering with case insensitive comparison
    const matchesCategory = !categoryFilter
      ? true
      : dream.category?.toLowerCase() === categoryFilter.toLowerCase();

    // Handle emotion filtering with case insensitive comparison
    const matchesEmotion = !emotionFilter
      ? true
      : dream.emotion?.toLowerCase() === emotionFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesEmotion;
  });

  const fetchComments = useCallback(
    async (dreamId: string) => {
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
          .order("created_at", { ascending: true });
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
    },
    [toast],
  );

  // Fetch comments when selected dream changes
  useEffect(() => {
    if (selectedDream) {
      fetchComments(selectedDream.id);
      if (
        refetchSelectedDreamLikes &&
        typeof refetchSelectedDreamLikes === "function"
      ) {
        refetchSelectedDreamLikes();
      }
    }
  }, [selectedDream, refetchSelectedDreamLikes, fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedDream || !newComment.trim() || isPostingComment)
      return;

    setIsPostingComment(true);

    try {
      const { error } = await supabase.from("comments").insert({
        dream_id: selectedDream.id,
        user_id: user.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setNewComment("");
      fetchComments(selectedDream.id);

      // Invalidate comment count query to update UI immediately
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", selectedDream.id],
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

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setEmotionFilter("");
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
      refreshLikes();
    }
  };

  const navigate = useNavigate();

  // Add a navigate handler function to properly close the dialog and navigate
  const handleProfileNavigation = (username: string) => {
    // Close the dialog first to avoid it persisting
    setSelectedDream(null);
    // Navigate to the profile
    navigate(`/profile/${username}`);
  };

  return (
    <div className="container mx-auto py-4 px-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center text-purple-600">
        Dream Explorer
      </h1>

      <div className="mb-4 md:mb-8 bg-card rounded-lg p-3 md:p-4 shadow-md">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-2 md:mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search dreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full h-9 md:h-10 rounded-md border border-input bg-background px-3 py-2"
              style={{ fontSize: "16px" }} // Prevent zoom on iOS
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="p-2">
                <h3 className="font-semibold mb-2">Categories</h3>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={
                      categoryFilter === "nightmare" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === "nightmare" ? "" : "nightmare",
                      )
                    }
                    className="justify-start"
                  >
                    Nightmare
                  </Button>
                  <Button
                    variant={categoryFilter === "lucid" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === "lucid" ? "" : "lucid",
                      )
                    }
                    className="justify-start"
                  >
                    Lucid
                  </Button>
                  <Button
                    variant={
                      categoryFilter === "recurring" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === "recurring" ? "" : "recurring",
                      )
                    }
                    className="justify-start"
                  >
                    Recurring
                  </Button>
                  <Button
                    variant={
                      categoryFilter === "prophetic" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === "prophetic" ? "" : "prophetic",
                      )
                    }
                    className="justify-start"
                  >
                    Prophetic
                  </Button>
                  <Button
                    variant={
                      categoryFilter === "normal" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === "normal" ? "" : "normal",
                      )
                    }
                    className="justify-start"
                  >
                    Normal
                  </Button>
                </div>

                <h3 className="font-semibold mt-4 mb-2">Emotions</h3>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={emotionFilter === "joy" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) => (prev === "joy" ? "" : "joy"))
                    }
                    className="justify-start"
                  >
                    Joy
                  </Button>
                  <Button
                    variant={emotionFilter === "fear" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "fear" ? "" : "fear",
                      )
                    }
                    className="justify-start"
                  >
                    Fear
                  </Button>
                  <Button
                    variant={
                      emotionFilter === "confusion" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "confusion" ? "" : "confusion",
                      )
                    }
                    className="justify-start"
                  >
                    Confusion
                  </Button>
                  <Button
                    variant={
                      emotionFilter === "anxiety" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "anxiety" ? "" : "anxiety",
                      )
                    }
                    className="justify-start"
                  >
                    Anxiety
                  </Button>
                  <Button
                    variant={emotionFilter === "peace" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "peace" ? "" : "peace",
                      )
                    }
                    className="justify-start"
                  >
                    Peace
                  </Button>
                  <Button
                    variant={
                      emotionFilter === "excitement" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "excitement" ? "" : "excitement",
                      )
                    }
                    className="justify-start"
                  >
                    Excitement
                  </Button>
                  <Button
                    variant={
                      emotionFilter === "sadness" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "sadness" ? "" : "sadness",
                      )
                    }
                    className="justify-start"
                  >
                    Sadness
                  </Button>
                  <Button
                    variant={
                      emotionFilter === "neutral" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setEmotionFilter((prev) =>
                        prev === "neutral" ? "" : "neutral",
                      )
                    }
                    className="justify-start"
                  >
                    Neutral
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && dreams.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive text-lg">Error loading dreams</p>
          <p className="text-muted-foreground">{String(error)}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      ) : filteredDreams.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No dreams found</h2>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter || emotionFilter
              ? "No dreams match your current filters"
              : "There are no public dreams to display yet"}
          </p>
          {(searchQuery || categoryFilter || emotionFilter) && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredDreams.map((dream) => (
              <DreamTile
                key={dream.id}
                dream={dream}
                onDreamClick={() => setSelectedDream(dream)}
                onShare={() => handleShareDream(dream.id)}
                refreshLikes={refreshLikes}
              />
            ))}
          </div>

          {/* Load more indicator - ref is attached here */}
          <div ref={loadMoreRef} className="py-6 md:py-8 text-center">
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin mr-2" />
                <span>Loading more dreams...</span>
              </div>
            ) : hasNextPage ? (
              <span className="text-muted-foreground">
                Scroll to load more dreams
              </span>
            ) : (
              <span className="text-muted-foreground">
                You've reached the end of dreams
              </span>
            )}
          </div>
        </>
      )}

      <Dialog open={!!selectedDream} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-5xl p-0 overflow-hidden bg-background transition-all duration-300 will-change-transform will-change-opacity border-none sm:rounded-none md:rounded-lg"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transform: "translate3d(-50%, -50%, 0)", // Force GPU acceleration
            // Prevent any white line flashes with a subtle shadow
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
                style={{
                  // Ensure smooth rendering of this section
                  willChange: "contents",
                  transform: "translateZ(0)",
                }}
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
                                selectedDream.profiles.username,
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Avatar className="h-8 w-8 transition-opacity hover:opacity-70">
                              <AvatarImage
                                src={selectedDream.profiles?.avatar_url || ""}
                              />
                              <AvatarFallback>
                                {selectedDream.profiles?.username.charAt(0) ||
                                  "U"}
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
                                selectedDream.profiles.username,
                              )
                            }
                            className="font-medium cursor-pointer transition-colors hover:text-muted-foreground"
                          >
                            {selectedDream.profiles?.username || "Anonymous"}
                          </span>
                        </ProfileHoverCard>
                      )}
                    </div>

                    {/* Add mobile-friendly back button */}
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
                  <div className="mb-4">
                    <h1 className="text-xl font-bold mb-2">
                      {selectedDream.title}
                    </h1>
                    <p className="text-muted-foreground mb-4">
                      {selectedDream.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedDream.category && (
                        <Badge variant="outline">
                          {selectedDream.category}
                        </Badge>
                      )}
                      {selectedDream.emotion && (
                        <Badge variant="outline">{selectedDream.emotion}</Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(selectedDream.created_at),
                        "MMMM d, yyyy",
                      )}
                    </p>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <div className="mb-4 space-y-4">
                      {isLoadingComments ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-2">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-1/3 mb-2" />
                                <Skeleton className="h-3 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-2">
                          No comments yet. Be the first to comment!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              {comment.profiles?.username && (
                                <ProfileHoverCard
                                  username={comment.profiles.username}
                                >
                                  <div
                                    onClick={() =>
                                      handleProfileNavigation(
                                        comment.profiles.username,
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Avatar className="h-7 w-7 flex-shrink-0 transition-opacity hover:opacity-70">
                                      <AvatarImage
                                        src={comment.profiles?.avatar_url || ""}
                                      />
                                      <AvatarFallback>
                                        {comment.profiles?.username?.charAt(
                                          0,
                                        ) || "U"}
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
                                            comment.profiles.username,
                                          )
                                        }
                                        className="font-medium text-sm cursor-pointer transition-colors hover:text-muted-foreground"
                                      >
                                        {comment.profiles?.username ||
                                          "Anonymous"}
                                      </span>
                                    </ProfileHoverCard>
                                  )}
                                  <p className="text-sm">{comment.content}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(comment.created_at),
                                    "MMM d",
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t">
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
                      <Share className="h-6 w-6" />
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
                        className="flex-1 bg-background text-sm rounded-md border border-input px-3 py-2"
                        style={{ fontSize: "16px" }} // Prevents iOS zoom on focus
                      />
                      <Button
                        type="submit"
                        disabled={!newComment.trim() || isPostingComment}
                        size="sm"
                      >
                        Post
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

type DreamTileProps = {
  dream: Dream;
  onDreamClick: () => void;
  onShare: () => void;
  refreshLikes: (dreamId?: string) => void;
};

const DreamTile: React.FC<DreamTileProps> = ({
  dream,
  onDreamClick,
  onShare,
  refreshLikes,
}) => {
  const {
    likesCount,
    hasLiked,
    toggleLike,
    isLoading: isLikeLoading,
  } = useDreamLikes(dream.id, () => refreshLikes(dream.id));

  const { commentCount, isLoading: isCommentCountLoading } =
    useDreamCommentCount(dream.id);

  const navigate = useNavigate();

  const handleProfileClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  const handleLikeClick = () => {
    toggleLike();
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDreamClick();

    // Set a small timeout to ensure the dialog opens before scrolling
    setTimeout(() => {
      const commentsElement = document.getElementById("comments");
      if (commentsElement) {
        commentsElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onDreamClick}
    >
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          {dream.image_url ? (
            <img
              src={dream.image_url}
              alt={dream.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Wand2 className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
            </div>
          )}
        </AspectRatio>
      </div>

      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1 md:mb-2">
          {dream.profiles?.username && (
            <ProfileHoverCard username={dream.profiles.username}>
              <div
                onClick={(e) => handleProfileClick(e, dream.profiles.username)}
                className="cursor-pointer"
              >
                <Avatar className="h-5 w-5 md:h-6 md:w-6 transition-opacity hover:opacity-70">
                  <AvatarImage src={dream.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {dream.profiles?.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </ProfileHoverCard>
          )}

          {dream.profiles?.username && (
            <ProfileHoverCard username={dream.profiles.username}>
              <span
                onClick={(e) => handleProfileClick(e, dream.profiles.username)}
                className="text-xs md:text-sm font-medium cursor-pointer transition-colors hover:text-muted-foreground"
              >
                {dream.profiles.username}
              </span>
            </ProfileHoverCard>
          )}
        </div>

        <h3 className="text-base md:text-lg font-bold line-clamp-1">
          {dream.title}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1">
          {dream.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-2">
          {dream.category && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 md:px-2 md:py-0.5"
            >
              {dream.category}
            </Badge>
          )}
          {dream.emotion && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 md:px-2 md:py-0.5"
            >
              {dream.emotion}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 md:p-4 pt-0 flex justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <div onClick={(e) => e.stopPropagation()} className="inline-block">
            <LikeButton
              isLiked={hasLiked}
              likesCount={likesCount}
              onClick={handleLikeClick}
              isLoading={isLikeLoading}
              showCount={true}
              className="text-sm"
            />
          </div>

          <div onClick={(e) => e.stopPropagation()} className="inline-block">
            <CommentButton
              commentCount={commentCount}
              isLoading={isCommentCountLoading}
              size="sm"
              onClick={handleCommentClick}
              className="text-sm"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="p-0"
          onClick={handleShareClick}
        >
          <Share className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
