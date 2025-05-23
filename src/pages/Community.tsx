import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Dream, Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { LikeButton } from "@/components/dreams/LikeButton";
import { MoreHorizontal, Share, Loader2, Users, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentButton } from "@/components/dreams/CommentButton";
import { useCallback, useRef, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommunityDreams, useFriendsDreams } from "@/hooks/use-dreams";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";
import { DreamTile } from "@/components/dreams/DreamTile";

import { useAuth } from "@/hooks/useAuth";

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // References for infinite scrolling
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const friendsLoadMoreRef = useRef<HTMLDivElement>(null);

  // Use the paginated community dreams hook
  const {
    data: dreamPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityDreams(10);

  // Use the friends dreams hook
  const {
    data: friendsDreamPages,
    isLoading: isLoadingFriends,
    error: friendsError,
    fetchNextPage: fetchNextFriendsPage,
    hasNextPage: hasNextFriendsPage,
    isFetchingNextPage: isFetchingNextFriendsPage,
  } = useFriendsDreams(user?.id, 10);

  // Extract all dreams from pages
  const publicDreams = dreamPages
    ? dreamPages.pages.flatMap((page) => page.dreams)
    : [];

  const friendsDreams = friendsDreamPages
    ? friendsDreamPages.pages.flatMap((page) => page.dreams)
    : [];

  // Setup intersection observer for infinite scrolling (Community tab)
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

  // Setup intersection observer for friends infinite scrolling
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasNextFriendsPage &&
        !isFetchingNextFriendsPage
      ) {
        fetchNextFriendsPage();
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
    });

    if (friendsLoadMoreRef.current) {
      observer.observe(friendsLoadMoreRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasNextFriendsPage, isFetchingNextFriendsPage, fetchNextFriendsPage]);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-purple-600">
        Dream Community
      </h1>

      <Tabs defaultValue="community" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Community</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community">
          <div className="space-y-8">
            {isLoading && publicDreams.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading dreams...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-destructive">
                  Failed to load dreams. Please try again.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
              </div>
            ) : publicDreams?.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">No public dreams found.</p>
              </div>
            ) : (
              <>
                {publicDreams?.map((dream) => (
                  <DreamCard key={dream.id} dream={dream} />
                ))}

                {/* Load more indicator for community dreams */}
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Loading more dreams...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-muted-foreground text-sm">
                      Scroll to load more dreams
                    </span>
                  ) : (
                    publicDreams.length > 5 && (
                      <span className="text-muted-foreground text-sm">
                        You've reached the end of dreams
                      </span>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="friends">
          {!user ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">
                Please sign in to see your friends' dreams.
              </p>
              <Button className="mt-4" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {isLoadingFriends && friendsDreams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Loading friends' dreams...
                  </p>
                </div>
              ) : friendsError ? (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-destructive">
                    Failed to load friends' dreams. Please try again.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Reload
                  </Button>
                </div>
              ) : friendsDreams?.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    No Dreams from Friends Yet
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    It looks like your friends haven't shared any dreams, or you
                    haven't added any friends yet.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                    <Button
                      onClick={() => navigate("/manage-friends")}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Manage Friends
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/community")}
                    >
                      Explore Community Dreams
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    {friendsDreams?.map((dream) => (
                      <FriendDreamCard key={dream.id} dream={dream} />
                    ))}
                  </div>

                  {/* Load more indicator for friends dreams */}
                  <div ref={friendsLoadMoreRef} className="py-4 text-center">
                    {isFetchingNextFriendsPage ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading more dreams...</span>
                      </div>
                    ) : hasNextFriendsPage ? (
                      <span className="text-muted-foreground text-sm">
                        Scroll to load more dreams
                      </span>
                    ) : (
                      friendsDreams.length > 5 && (
                        <span className="text-muted-foreground text-sm">
                          You've reached the end of dreams
                        </span>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface DreamCardProps {
  dream: Dream & { profiles: Pick<Profile, "username" | "avatar_url"> };
}

function DreamCard({ dream }: DreamCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const refreshLikes = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["dream-likes-count", dream.id],
    });
  }, [queryClient, dream.id]);

  const {
    likesCount,
    hasLiked,
    toggleLike,
    isLoading: isLikeLoading,
  } = useDreamLikes(dream.id, refreshLikes);
  const { commentCount, isLoading: isCommentCountLoading } =
    useDreamCommentCount(dream.id);

  // Get the first letter of the username for avatar fallback, with null check
  const avatarFallback = dream.profiles?.username
    ? dream.profiles.username.charAt(0).toUpperCase()
    : "U";

  const fetchComments = useCallback(async () => {
    if (!dream.id) return;

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
        .eq("dream_id", dream.id)
        .order("created_at", { ascending: false })
        .limit(2); // Only fetch top 2 comments for preview

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
  }, [dream.id, toast]);

  useEffect(() => {
    // Fetch comments on initial load
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !dream.id || !newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);

    try {
      const { error } = await supabase.from("comments").insert({
        dream_id: dream.id,
        user_id: user.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setNewComment("");
      fetchComments();

      // Invalidate comment count query to update UI immediately
      queryClient.invalidateQueries({
        queryKey: ["dream-comments-count", dream.id],
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

  const handleLikeClick = () => {
    toggleLike();
  };

  const handleCommentClick = () => {
    // Navigate to dream detail with the comments hash
    navigate(`/dream/${dream.id}#comments`);
  };

  const handleShareDream = () => {
    const shareUrl = `${window.location.origin}/dream/${dream.id}`;

    if (navigator.share) {
      navigator
        .share({
          title: dream.title,
          text: `Check out this dream: ${dream.title}`,
          url: shareUrl,
        })
        .catch((error) => console.error("Error sharing:", error));
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          toast({
            title: "Link copied",
            description: "Dream link copied to clipboard!",
          });
        })
        .catch((err) => console.error("Copy failed:", err));
    }
  };

  return (
    <Card
      key={dream.id}
      className="overflow-hidden border-none shadow-md dark:shadow-lg dark:shadow-slate-700/50 cursor-pointer"
      onClick={() => navigate(`/dream/${dream.id}`)}
    >
      {/* Card Header with Author Info */}
      <CardHeader className="flex flex-row items-center justify-between p-4 space-y-0">
        <div className="flex items-center space-x-3 flex-shrink min-w-0 max-w-[60%]">
          <ProfileHoverCard username={dream.profiles.username}>
            <div
              className="cursor-pointer transition-opacity hover:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${dream.profiles.username}`);
              }}
            >
              <Avatar className="flex-shrink-0">
                {dream.profiles.avatar_url && (
                  <AvatarImage
                    src={dream.profiles.avatar_url}
                    alt={dream.profiles.username}
                  />
                )}
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
            </div>
          </ProfileHoverCard>
          <div className="truncate min-w-0">
            <ProfileHoverCard username={dream.profiles.username}>
              <div
                className="cursor-pointer transition-colors hover:text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${dream.profiles.username}`);
                }}
              >
                <CardTitle className="text-base truncate">
                  {dream.profiles.username}
                </CardTitle>
              </div>
            </ProfileHoverCard>
            <p className="text-xs text-muted-foreground truncate">
              {new Date(dream.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
          <div className="flex gap-1 justify-end">
            <Badge variant="outline" className="truncate max-w-[70px]">
              {dream.category}
            </Badge>
            <Badge variant="outline" className="truncate max-w-[70px]">
              {dream.emotion}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareDream();
                }}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Dream Content */}
      <CardContent className="p-0">
        {/* Dream Title - Now part of the clickable card */}
        <div className="px-4 pt-1 pb-3">
          <h3 className="font-bold">{dream.title}</h3>
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
            <div onClick={(e) => e.stopPropagation()}>
              <LikeButton
                isLiked={hasLiked}
                likesCount={likesCount}
                onClick={handleLikeClick}
                isLoading={isLikeLoading}
              />
            </div>
            <CommentButton
              commentCount={commentCount}
              isLoading={isCommentCountLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleCommentClick();
              }}
            />
          </div>

          {/* Like Count */}
          {likesCount > 0 && (
            <p className="font-medium text-sm mb-2">
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </p>
          )}

          {/* Dream Description */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mt-1">
              {dream.description}
            </p>
          </div>

          {/* Comments Preview Section - Always visible */}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            {commentCount > 0 && (
              <p className="text-sm text-muted-foreground mb-2">
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </p>
            )}

            <div className="space-y-3">
              {isLoadingComments ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <div className="h-4 w-20 mb-0 bg-muted animate-pulse mr-1" />
                          <div className="h-4 w-32 bg-muted animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                commentCount > 0 ? (
                  <p
                    className="text-sm text-muted-foreground hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dream/${dream.id}#comments`);
                    }}
                  >
                    View all comments
                  </p>
                ) : null
              ) : (
                <>
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
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
                          <div className="inline-flex items-baseline">
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
                        </div>
                      </div>
                    ))}
                  </div>

                  {commentCount > 2 && (
                    <button
                      className="text-sm text-muted-foreground mt-1 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dream/${dream.id}#comments`);
                      }}
                    >
                      View all {commentCount} comments
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* User comment input - only shown when explicitly adding comments */}
          {user && (
            <form
              onSubmit={(e) => {
                e.stopPropagation();
                handlePostComment(e);
              }}
              className="flex gap-2 mt-4 pt-3 border-t"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-background text-sm rounded-md border border-input px-3 py-2"
                style={{ fontSize: "16px" }} // Prevents iOS zoom on focus
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || isPostingComment}
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                Post
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying friends' dreams in the Friends tab
interface FriendDreamCardProps {
  dream: Dream & { profiles?: Pick<Profile, "id" | "username" | "avatar_url"> };
}

function FriendDreamCard({ dream }: FriendDreamCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleShareDream = (dreamId: string) => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Dream link copied to clipboard!",
      });
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/dream/${dream.id}`)}
      >
        {dream.image_url && (
          <div className="aspect-video w-full">
            <img
              src={dream.image_url}
              alt={dream.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4">
          {/* User info header */}
          <div className="flex items-center gap-3 mb-3">
            {dream.profiles?.username && (
              <ProfileHoverCard username={dream.profiles.username}>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={dream.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {dream.profiles?.username?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {dream.profiles?.username || "Anonymous"}
                  </span>
                </div>
              </ProfileHoverCard>
            )}
          </div>

          {/* Dream content */}
          <h3 className="font-bold text-lg mb-2">{dream.title}</h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
            {dream.description}
          </p>

          {/* Tags/badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {dream.category && (
              <Badge variant="outline" className="text-xs">
                {dream.category}
              </Badge>
            )}
            {dream.emotion && (
              <Badge variant="outline" className="text-xs">
                {dream.emotion}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {new Date(dream.created_at).toLocaleDateString()}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleShareDream(dream.id);
              }}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Community;
