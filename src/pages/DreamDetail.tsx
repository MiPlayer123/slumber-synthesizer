import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dream, Profile, Comment, DreamVisibility } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Share,
  ArrowLeft,
  Loader2,
  Trash2,
  MoreVertical,
  Globe,
  Users,
  Lock,
  ExternalLink,
  Heart,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
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
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// Updated Interface for the public dream response to match Edge Function
interface PublicDreamResponse {
  dream?: Omit<Dream, "profiles" | "comments" | "like_count"> & {
    likes_count?: number;
  }; // Core dream data, adjusted fields
  author?: Profile; // Author details at top level
  analysis?: any; // Keeping analysis for potential future use, but won't display now
  metadata?: {
    // Metadata at top level
    isPublic?: boolean;
    canView?: boolean;
    shareUrl?: string;
    deepLink?: string;
    visibility?: DreamVisibility; // Use DreamVisibility type
    requiresAuth?: boolean;
  };
  // Fields for error responses or initial state
  error?: string;
  visibility?: DreamVisibility; // For error/privacy states primarily
  requiresAuth?: boolean; // For error/privacy states
  requiresFriendship?: boolean; // For error/privacy states
}

export default function DreamDetail() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isPublicView = !location.pathname.includes("/app");

  // App view state
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]); // For app view
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Public view state
  const [publicDreamResponse, setPublicDreamResponse] =
    useState<PublicDreamResponse | null>(null);
  const [isLoadingPublicDream, setIsLoadingPublicDream] =
    useState(isPublicView);
  const [publicViewError, setPublicViewError] = useState<string | null>(null);
  const [publicPrivacyInfo, setPublicPrivacyInfo] = useState<{
    visibility?: DreamVisibility;
    requiresAuth?: boolean;
    requiresFriendship?: boolean;
  }>({});
  const [publicComments, setPublicComments] = useState<Comment[]>([]);
  const [isLoadingPublicComments, setIsLoadingPublicComments] = useState(false);
  const [newPublicComment, setNewPublicComment] = useState("");
  const [isPostingPublicComment, setIsPostingPublicComment] = useState(false);

  const commentsRef = useRef<HTMLDivElement>(null);
  const fromProfile = location.state?.fromProfile === true;
  const { hasReachedLimit } = useSubscription();
  const { commentCount: appViewCommentCount } = useDreamCommentCount(
    dreamId || "",
  );

  // HELPER FUNCTIONS (handlePublicShare, handleOpenInApp, handleLoginRedirect, copyToClipboard - largely unchanged)
  const handlePublicShare = () => {
    if (!publicDreamResponse?.dream || !publicDreamResponse.metadata) return;
    const shareUrl =
      publicDreamResponse.metadata.shareUrl ||
      `${window.location.origin}/dream/${dreamId}`;
    const dreamData = publicDreamResponse.dream;
    const shareData = {
      title: dreamData.title || "Shared Dream",
      text:
        dreamData.description?.slice(0, 100) + "..." || "Check out this dream!",
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      navigator.share(shareData).catch(() => copyToClipboard(shareUrl));
    } else {
      copyToClipboard(shareUrl);
    }
  };
  const handleOpenInApp = () => {
    const appUrl =
      publicDreamResponse?.metadata?.deepLink || `rem://dream/${dreamId}`;
    window.location.href = appUrl;
    setTimeout(() => {
      toast({
        title: "App not found",
        description:
          "Please install Rem to view this dream with full features.",
      });
    }, 2000);
  };
  const handleLoginRedirect = () => {
    navigate("/auth", { state: { from: `/dream/${dreamId}` } });
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

  const getPublicVisibilityIcon = (visibility?: DreamVisibility) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-4 h-4" />;
      case "friends_only":
        return <Users className="w-4 h-4" />;
      case "private":
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  // Effect for fetching public dream data
  useEffect(() => {
    if (!isPublicView || !dreamId) {
      if (isPublicView) setIsLoadingPublicDream(false);
      return;
    }
    async function fetchPublicDream() {
      setIsLoadingPublicDream(true);
      setPublicViewError(null);
      setPublicDreamResponse(null);
      setPublicPrivacyInfo({}); // Reset privacy info
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          `get-public-dream/${dreamId}`,
          {
            headers: user
              ? {
                  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                }
              : undefined,
          },
        );

        if (functionError) throw functionError; // Throw network or function invocation errors

        const response = data as PublicDreamResponse; // Cast the successful data

        if (response.error) {
          // Handle errors returned in the function's JSON response (e.g. 403)
          setPublicViewError(response.error);
          setPublicPrivacyInfo({
            visibility: response.visibility,
            requiresAuth: response.requiresAuth,
            requiresFriendship: response.requiresFriendship,
          });
          setPublicDreamResponse(response); // Store partial response for error display
        } else if (!response.dream || !response.metadata) {
          setPublicViewError("Dream data is incomplete.");
          setPublicPrivacyInfo({ visibility: "private" });
        } else {
          setPublicDreamResponse(response); // Store full successful response
        }
      } catch (err: any) {
        console.error("Error fetching public dream:", err);
        // Differentiate between function's JSON error and other errors
        if (err.message && !publicViewError) {
          setPublicViewError(
            err.message || "Failed to load dream. Please try again.",
          );
        }
        if (!publicPrivacyInfo.visibility) {
          setPublicPrivacyInfo({ visibility: "private" });
        }
      } finally {
        setIsLoadingPublicDream(false);
      }
    }
    fetchPublicDream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreamId, user, isPublicView, location.key]); // location.key to refetch on nav

  // Effect for fetching PUBLIC comments (runs after public dream data is loaded)
  useEffect(() => {
    async function fetchPublicCommentsAndUpdateState() {
      if (!dreamId || !publicDreamResponse?.dream) {
        if (isPublicView) setIsLoadingPublicComments(false);
        setPublicComments([]);
        return;
      }
      if (!isPublicView) return;

      setIsLoadingPublicComments(true);
      try {
        const { data, error } = await supabase
          .from("comments")
          .select("*, profiles (username, avatar_url, full_name)")
          .eq("dream_id", dreamId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setPublicComments(data || []);
      } catch (err) {
        console.error("Error fetching public comments:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load comments for this dream.",
        });
        setPublicComments([]);
      } finally {
        setIsLoadingPublicComments(false);
      }
    }

    if (isPublicView && publicDreamResponse?.dream) {
      fetchPublicCommentsAndUpdateState();
    }
  }, [dreamId, isPublicView, publicDreamResponse?.dream, user, toast]);

  // Modified effect for fetching app-internal dream data
  useEffect(() => {
    if (isPublicView || !dreamId) {
      setLoading(false);
      return;
    }
    async function fetchAppData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("dreams")
          .select(
            `*, profiles:user_id (id, username, avatar_url, full_name, created_at, updated_at)`,
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
        console.error("Error fetching app dream details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAppData();
  }, [dreamId, isPublicView]);

  // Check for analyze parameter and apply free limit check (Applies to internal /app route)
  useEffect(() => {
    if (isPublicView) return;
    const searchParams = new URLSearchParams(location.search);
    const shouldAnalyze = searchParams.get("analyze") === "true";
    if (shouldAnalyze && dreamId && user) {
      if (hasReachedLimit("analysis")) {
        toast({
          variant: "destructive",
          title: "Free Limit Reached",
          description:
            "You've reached your free dream analysis limit this week. Upgrade to premium for unlimited analyses.",
        });
        const newUrl = location.pathname; // Use location.pathname for /app route
        window.history.replaceState({}, "", newUrl);
        return;
      }
      navigate("/journal", {
        state: { fromDreamDetail: true, analyzeDreamId: dreamId },
        replace: true,
      });
    }
  }, [
    location.search,
    dreamId,
    hasReachedLimit,
    toast,
    navigate,
    user,
    isPublicView,
    location.pathname,
  ]);

  const fetchComments = useCallback(async () => {
    if (isPublicView || !dreamId) return;
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, profiles(username, avatar_url, id, full_name)`)
        .eq("dream_id", dreamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching app comments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load comments",
      });
    } finally {
      setIsLoadingComments(false);
    }
  }, [dreamId, toast, isPublicView]);

  useEffect(() => {
    if (!isPublicView && dreamId && !loading) fetchComments();
  }, [dreamId, loading, fetchComments, isPublicView]);

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

  // Definition for existingHandleShareDream (for App View)
  const existingHandleShareDream = () => {
    const currentDreamForShare = isPublicView
      ? publicDreamResponse?.dream
      : dream; // This uses component state
    if (!currentDreamForShare) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Dream data not available for sharing.",
      });
      return;
    }
    // Use app-specific URL for sharing if different, or public URL as fallback/default
    const shareUrl = `${window.location.origin}/dream/${currentDreamForShare.id}`;
    const title = currentDreamForShare.title || "Shared Dream";
    const text = currentDreamForShare.description
      ? currentDreamForShare.description.slice(0, 100) + "..."
      : "Check out this dream!";

    if (navigator.share) {
      navigator.share({ title, text, url: shareUrl }).catch((error) => {
        console.error("Error sharing dream:", error);
        copyToClipboard(shareUrl); // Fallback to copy
      });
    } else {
      copyToClipboard(shareUrl);
    }
  };

  // --- NEW: Handler for posting comments in PUBLIC view (if authenticated) ---
  const handlePostPublicComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      !user ||
      !dreamId ||
      !newPublicComment.trim() ||
      isPostingPublicComment ||
      !publicDreamResponse?.dream
    )
      return;

    setIsPostingPublicComment(true);
    try {
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({
          dream_id: dreamId,
          user_id: user.id,
          content: newPublicComment.trim(),
        })
        .select("*, profiles (username, avatar_url, full_name)")
        .single();

      if (error) throw error;

      if (newCommentData) {
        setPublicComments((prevComments) => [
          ...prevComments,
          newCommentData as Comment,
        ]);
      }
      setNewPublicComment("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added.",
      });
    } catch (err) {
      console.error("Error posting public comment:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment.",
      });
    } finally {
      setIsPostingPublicComment(false);
    }
  };

  if (isPublicView) {
    if (isLoadingPublicDream) {
      return (
        <>
          <Helmet>
            <title>Loading Dream... | Rem</title>
          </Helmet>
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </>
      );
    }

    if (
      publicViewError ||
      !publicDreamResponse?.dream ||
      !publicDreamResponse?.metadata
    ) {
      const displayVisibility =
        publicDreamResponse?.visibility ||
        publicPrivacyInfo.visibility ||
        "private";
      const displayError =
        publicViewError ||
        publicDreamResponse?.error ||
        "This dream could not be found or is not accessible.";
      const displayRequiresAuth =
        publicDreamResponse?.requiresAuth ||
        publicPrivacyInfo.requiresAuth ||
        false;
      return (
        <div className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-md mb-4">
            <Button
              variant="ghost"
              onClick={() => (user ? navigate(-1) : navigate("/"))}
              className="flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </Button>
          </div>
          <Card className="w-full max-w-md text-center bg-card text-card-foreground border border-border">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                {getPublicVisibilityIcon(displayVisibility)}
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                {displayVisibility === "private"
                  ? "Private Dream"
                  : displayVisibility === "friends_only"
                    ? "Friends Only"
                    : "Dream Not Found"}
              </h1>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{displayError}</p>
              {displayRequiresAuth && (
                <Button onClick={handleLoginRedirect} className="w-full">
                  Login to View
                </Button>
              )}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleOpenInApp}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Rem App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const pubDream = publicDreamResponse.dream;
    const pubAuthor = publicDreamResponse.author;
    const pubMetadata = publicDreamResponse.metadata;
    const publicLikeCount = pubDream.likes_count || 0;

    return (
      <>
        <Helmet>
          <title>
            {pubDream.title} - {pubAuthor?.username || "Dream"} | Rem
          </title>
          <meta
            name="description"
            content={
              pubDream.description?.slice(0, 160) + "..." ||
              "A dream shared on Rem"
            }
          />
          <meta
            property="og:title"
            content={`${pubDream.title} - ${pubAuthor?.username || "Dream"}`}
          />
          <meta
            property="og:description"
            content={
              pubDream.description?.slice(0, 300) + "..." ||
              "A dream shared on Rem"
            }
          />
          <meta
            property="og:image"
            content={
              pubDream.image_url || "https://lucidrem.com/preview_image.png"
            }
          />
          <meta
            property="og:url"
            content={
              pubMetadata?.shareUrl ||
              `${window.location.origin}/dream/${dreamId}`
            }
          />
          <meta property="og:type" content="article" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={`${pubDream.title} - ${pubAuthor?.username || "Dream"}`}
          />
          <meta
            name="twitter:description"
            content={
              pubDream.description?.slice(0, 200) + "..." ||
              "A dream shared on Rem"
            }
          />
          <meta
            name="twitter:image"
            content={
              pubDream.image_url || "https://lucidrem.com/preview_image.png"
            }
          />
        </Helmet>
        <div className="min-h-screen bg-background text-foreground py-6 sm:py-10">
          <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 flex">
            <Button
              variant="ghost"
              onClick={() => {
                if (user) {
                  navigate(
                    location.state?.from ||
                      (location.key === "default" ? "/dream-wall" : -1),
                  );
                } else {
                  navigate("/");
                }
              }}
              className="flex items-center gap-1.5 text-sm pr-2"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </Button>
          </div>

          <main>
            <Card className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto overflow-hidden shadow-xl bg-card text-card-foreground border border-border">
              <div className="md:flex">
                <div className="md:w-5/12 md:flex-shrink-0 bg-black/5 dark:bg-white/5 flex items-center justify-center p-2 md:p-0">
                  {pubDream.image_url ? (
                    <img
                      src={pubDream.image_url}
                      alt={pubDream.title || "Dream image"}
                      className="w-full h-auto max-h-[70vh] md:max-h-none object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full flex items-center justify-center text-muted-foreground italic">
                      No image available
                    </div>
                  )}
                </div>

                <div className="md:w-7/12 p-4 sm:p-6 flex flex-col">
                  {pubAuthor && (
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                        <AvatarImage src={pubAuthor.avatar_url || ""} />
                        <AvatarFallback>
                          {pubAuthor.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-base sm:text-lg">
                          {pubAuthor.full_name || pubAuthor.username}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(
                            new Date(pubDream.created_at),
                            "MMMM d, yyyy",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 leading-tight">
                    {pubDream.title}
                  </h1>

                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-card-foreground/90 leading-relaxed whitespace-pre-wrap mb-4 flex-shrink-0">
                    <p>{pubDream.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-3 sm:mb-4 pt-3 mt-auto border-t border-border/70 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${publicLikeCount > 0 ? "text-red-500" : "text-muted-foreground"}`}
                        />
                        {publicLikeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        {isLoadingPublicComments && publicComments.length === 0
                          ? "-"
                          : publicComments.length}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePublicShare}
                      className="text-xs sm:text-sm"
                    >
                      <Share className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                      Share
                    </Button>
                  </div>

                  <div className="mb-4 flex-shrink-0">
                    {user ? (
                      <form
                        onSubmit={handlePostPublicComment}
                        className="space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 mt-1 flex-shrink-0">
                            <AvatarImage
                              src={user.user_metadata?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {(user.email || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Textarea
                            placeholder="Add a public comment..."
                            value={newPublicComment}
                            onChange={(e) =>
                              setNewPublicComment(e.target.value)
                            }
                            rows={2}
                            className="flex-grow text-sm"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            !newPublicComment.trim() || isPostingPublicComment
                          }
                          className="w-full sm:w-auto float-right"
                        >
                          {isPostingPublicComment ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Post Comment
                        </Button>
                      </form>
                    ) : (
                      <Button
                        onClick={handleOpenInApp}
                        size="sm"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Join the conversation - Open in Rem App
                      </Button>
                    )}
                  </div>

                  <div className="border-t border-border/70 pt-3 flex-grow flex flex-col min-h-0 flex-shrink-0">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex-shrink-0">
                      Comments ({publicComments.length})
                    </h3>
                    {isLoadingPublicComments && publicComments.length === 0 && (
                      <div className="flex justify-center items-center py-4 flex-grow">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    {!isLoadingPublicComments &&
                      publicComments.length === 0 &&
                      !user && (
                        <p className="text-muted-foreground text-sm text-center py-3 flex-grow">
                          No comments yet.
                        </p>
                      )}
                    {!isLoadingPublicComments &&
                      publicComments.length === 0 &&
                      user && (
                        <p className="text-muted-foreground text-sm text-center py-3 flex-grow">
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    {publicComments.length > 0 && (
                      <ScrollArea
                        className="pr-2 flex-grow"
                        style={{ minHeight: "100px" }}
                      >
                        <div className="space-y-3">
                          {publicComments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start gap-2.5"
                            >
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mt-0.5 flex-shrink-0">
                                <AvatarImage
                                  src={
                                    comment.profiles?.avatar_url || undefined
                                  }
                                />
                                <AvatarFallback>
                                  {comment.profiles?.username?.[0]?.toUpperCase() ||
                                    "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-muted/40 p-2.5 rounded-md shadow-sm">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-medium text-xs sm:text-sm">
                                    {comment.profiles?.username || "Anonymous"}
                                  </span>
                                  <time className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(comment.created_at),
                                      { addSuffix: true },
                                    )}
                                  </time>
                                </div>
                                <p className="text-sm text-card-foreground/80 whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </main>
        </div>
      </>
    );
  }

  // --- APP VIEW (Existing Logic) ---
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
          <h1 className="text-2xl font-bold mb-4">
            Dream Not Found (App View)
          </h1>
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
                      navigate(`/profile/${dream.profiles.username}/app`);
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
                <DreamLikeButton
                  dreamId={dream.id!}
                  onSuccess={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["dream-likes-count"],
                    })
                  }
                />
              )}

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={existingHandleShareDream}
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
                {appViewCommentCount > 0
                  ? `${appViewCommentCount} Comments`
                  : "Comments"}
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
                                  `/profile/${comment.profiles.username}/app`,
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
                                        `/profile/${comment.profiles.username}/app`,
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
