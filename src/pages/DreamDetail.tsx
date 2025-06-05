import React, { useEffect, useState } from "react";
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
  Globe,
  Lock,
  Heart,
  MessageCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useSubscription } from "@/hooks/use-subscription";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
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

// Placeholder for your custom loading skeleton component
const DreamDetailLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="ml-4">Loading dream details...</p>
  </div>
);

// Placeholder for your custom privacy/error screen component
const DreamPrivacyErrorScreen = (props: {
  error?: string;
  visibility?: string;
  requiresAuth?: boolean;
  requiresFriendship?: boolean;
  onLogin?: () => void;
  onBack?: () => void;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-muted dark:bg-background">
    <div className="bg-card p-8 rounded-lg shadow-xl max-w-md w-full">
      <div className="mx-auto mb-4 p-3 bg-destructive/20 rounded-full w-fit text-destructive">
        {props.visibility === "private" ||
        props.visibility === "friends_only" ? (
          <Lock className="w-8 h-8" />
        ) : (
          <Globe className="w-8 h-8" />
        )}
      </div>
      <h1 className="text-2xl font-bold mb-2 text-card-foreground">
        {props.visibility === "private"
          ? "Private Dream"
          : props.visibility === "friends_only"
            ? "Friends Only Access"
            : "Dream Not Accessible"}
      </h1>
      <p className="mb-6 text-muted-foreground">
        {props.error || "This dream cannot be displayed at this time."}
      </p>
      {props.requiresAuth && props.onLogin && (
        <Button onClick={props.onLogin} className="w-full mb-3">
          Login to View
        </Button>
      )}
      {props.onBack && (
        <Button variant="outline" onClick={props.onBack} className="w-full">
          Go Back
        </Button>
      )}
    </div>
  </div>
);

export default function DreamDetail() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasReachedLimit } = useSubscription();

  const isPublicView = !location.pathname.includes("/app");
  const fromProfile = location.state?.fromProfile === true;

  // App view state
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(isPublicView ? false : true);

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

  // HELPER FUNCTIONS
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

  // Effect for analyze parameter
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
        const newUrl = location.pathname;
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

  // MODIFIED: Effect for fetching APP-VIEW dream data
  useEffect(() => {
    if (isPublicView || !dreamId) {
      if (!isPublicView) setLoading(false);
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
        console.error("Error fetching app dream:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dream details for app view",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAppData();
  }, [dreamId, toast, isPublicView]);

  // NEW: Effect for fetching PUBLIC dream data
  useEffect(() => {
    if (!isPublicView || !dreamId) {
      if (isPublicView) setIsLoadingPublicDream(false);
      return;
    }
    async function fetchPublicDreamData() {
      setIsLoadingPublicDream(true);
      setPublicViewError(null);
      setPublicDreamResponse(null);
      setPublicPrivacyInfo({});
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
        if (functionError) throw functionError;
        const response = data as PublicDreamResponse;
        if (response.error) {
          setPublicViewError(response.error);
          setPublicPrivacyInfo({
            visibility: response.visibility,
            requiresAuth: response.requiresAuth,
            requiresFriendship: response.requiresFriendship,
          });
          setPublicDreamResponse(response);
        } else if (!response.dream || !response.metadata) {
          setPublicViewError("Dream data is incomplete or not found.");
          setPublicPrivacyInfo({ visibility: "private" });
        } else {
          setPublicDreamResponse(response);
        }
      } catch (err: any) {
        console.error("Error fetching public dream:", err);
        setPublicViewError(
          err.message || "Failed to load dream. Please try again.",
        );
        if (!publicPrivacyInfo.visibility) {
          setPublicPrivacyInfo({ visibility: "private" });
        }
      } finally {
        setIsLoadingPublicDream(false);
      }
    }
    fetchPublicDreamData();
  }, [dreamId, user, isPublicView, location.key, publicPrivacyInfo.visibility]);

  // NEW: Effect for fetching PUBLIC comments
  useEffect(() => {
    async function fetchPublicCommentsAndUpdateState() {
      if (
        !isPublicView ||
        !dreamId ||
        !publicDreamResponse?.dream ||
        !publicDreamResponse?.metadata?.canView
      ) {
        if (isPublicView) setIsLoadingPublicComments(false);
        setPublicComments([]);
        return;
      }
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
    if (
      isPublicView &&
      publicDreamResponse?.dream &&
      publicDreamResponse?.metadata?.canView
    ) {
      fetchPublicCommentsAndUpdateState();
    }
  }, [dreamId, isPublicView, publicDreamResponse, user, toast]);

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

  console.log("OG Meta Variables:", encodeURIComponent(dreamId!));

  // --- OG Meta Tag Constants ---
  let ogTitle = "Rem Dream Shared!";
  let ogDescription =
    "View this dream on Rem, the AI powered social dream journal.";
  let ogImageUrl = `${import.meta.env.VITE_APP_URL}/api/og/user/${encodeURIComponent(dreamId!)}`;
  let pageUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  let canonicalUrl = pageUrl;
  let shouldIndexPage = true;

  // --- Public View Logic ---
  if (isPublicView) {
    if (isLoadingPublicDream) {
      ogTitle = "Loading Dream... | Rem";
      shouldIndexPage = false; // Don't index loading pages ideally
      return (
        <>
          <Helmet>
            <title>{ogTitle}</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <DreamDetailLoadingSkeleton />
        </>
      );
    }

    if (
      publicViewError ||
      !publicDreamResponse?.dream ||
      !publicDreamResponse?.metadata?.canView
    ) {
      ogTitle = "Dream Not Accessible | Rem";
      ogDescription =
        publicViewError || "This dream is private or could not be found.";
      shouldIndexPage = false;
      // Ensure pageUrl uses dreamId if available for consistency, even on error pages
      if (dreamId) {
        pageUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/dream/${encodeURIComponent(dreamId)}`;
        canonicalUrl = pageUrl;
      }
      console.log("OG Meta Debug:", {
        ogTitle,
        ogDescription,
        ogImageUrl,
        pageUrl,
        canonicalUrl,
        shouldIndexPage,
        dreamId,
        isPublicView,
        publicDreamResponse,
      });

      return (
        <>
          <Helmet>
            <title>{ogTitle}</title>
            <meta name="description" content={ogDescription} />
            <meta property="og:title" content={ogTitle} />
            <meta property="og:description" content={ogDescription} />
            <meta property="og:url" content={pageUrl} />
            <meta property="og:image" content={ogImageUrl} />{" "}
            {/* Default image for error/private */}
            <link rel="canonical" href={canonicalUrl} />
            <meta name="robots" content="noindex" />
          </Helmet>
          <DreamPrivacyErrorScreen
            error={publicViewError || "This dream is not accessible."}
            visibility={
              publicDreamResponse?.visibility || publicPrivacyInfo.visibility
            }
            requiresAuth={
              publicDreamResponse?.requiresAuth ||
              publicPrivacyInfo.requiresAuth
            }
            requiresFriendship={
              publicDreamResponse?.requiresFriendship ||
              publicPrivacyInfo.requiresFriendship
            }
            onLogin={handleLoginRedirect}
            onBack={() =>
              navigate(
                fromProfile
                  ? `/profile/${publicDreamResponse?.author?.username}`
                  : "/community",
              )
            }
          />
        </>
      );
    }

    // If public dream is viewable
    const dreamData = publicDreamResponse.dream;
    const authorData = publicDreamResponse.author;
    const metadata = publicDreamResponse.metadata;

    const siteUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    ogImageUrl = `${siteUrl}/api/og/dream/${encodeURIComponent(dreamId!)}`;
    canonicalUrl =
      metadata?.shareUrl || `${siteUrl}/dream/${encodeURIComponent(dreamId!)}`;
    pageUrl = canonicalUrl;
    ogTitle = dreamData.title
      ? `${dreamData.title} | Rem`
      : "A Shared Dream | Rem";
    ogDescription = dreamData.description
      ? dreamData.description.substring(0, 160) +
        (dreamData.description.length > 160 ? "..." : "")
      : "Explore this dream on Rem, the AI powered social dream journal.";
    shouldIndexPage = true;

    return (
      <>
        <Helmet>
          <title>{ogTitle}</title>
          <meta name="description" content={ogDescription} />
          <link rel="canonical" href={canonicalUrl} />

          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          <meta property="og:image" content={ogImageUrl} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="article" />
          <meta property="og:site_name" content="Rem" />
          {authorData?.username && (
            <meta property="article:author" content={authorData.username} />
          )}
          {dreamData.created_at && (
            <meta
              property="article:published_time"
              content={new Date(dreamData.created_at).toISOString()}
            />
          )}

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogTitle} />
          <meta name="twitter:description" content={ogDescription} />
          <meta name="twitter:image" content={ogImageUrl} />
          {/* <meta name="twitter:site" content="@YourTwitterHandle" /> */}
          {shouldIndexPage ? (
            <meta name="robots" content="index, follow" />
          ) : (
            <meta name="robots" content="noindex" />
          )}
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/50 dark:to-gray-800 text-gray-800 dark:text-gray-200">
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
                  {dreamData.image_url ? (
                    <img
                      src={dreamData.image_url}
                      alt={dreamData.title || "Dream image"}
                      className="w-full h-auto max-h-[70vh] md:max-h-none object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full flex items-center justify-center text-muted-foreground italic">
                      No image available
                    </div>
                  )}
                </div>

                <div className="md:w-7/12 p-4 sm:p-6 flex flex-col">
                  {authorData && (
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                        <AvatarImage src={authorData.avatar_url || ""} />
                        <AvatarFallback>
                          {authorData.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-base sm:text-lg">
                          {authorData.full_name || authorData.username}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(
                            new Date(dreamData.created_at),
                            "MMMM d, yyyy",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 leading-tight">
                    {dreamData.title}
                  </h1>

                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-card-foreground/90 leading-relaxed whitespace-pre-wrap mb-4 flex-shrink-0">
                    <p>{dreamData.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-3 sm:mb-4 pt-3 mt-auto border-t border-border/70 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${dreamData.likes_count > 0 ? "text-red-500" : "text-muted-foreground"}`}
                        />
                        {dreamData.likes_count}
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
                      <div className="pr-2 flex-grow">
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
                      </div>
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
  // --- App View Logic (Authenticated) ---
  else if (!isPublicView) {
    if (loading) {
      // This is the `loading` state for the app view's `dream`
      ogTitle = "Loading Dream... | Rem Journal";
      shouldIndexPage = false;
      return (
        <>
          <Helmet>
            <title>{ogTitle}</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <DreamDetailLoadingSkeleton />
        </>
      );
    }

    if (!dream) {
      ogTitle = "Dream Not Found | Rem Journal";
      shouldIndexPage = false;
      return (
        <>
          <Helmet>
            <title>{ogTitle}</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <div className="container mx-auto p-4 text-center">
            <p className="text-xl">
              Dream not found or you do not have access.
            </p>
            <Button onClick={() => navigate("/journal")} className="mt-4">
              Back to Journal
            </Button>
          </div>
        </>
      );
    }

    // If dream data is available for app view
    ogTitle = dream.title
      ? `${dream.title} | Rem Journal`
      : "Dream Details | Rem Journal";
    ogDescription = dream.description
      ? dream.description.substring(0, 160) +
        (dream.description.length > 160 ? "..." : "")
      : "View your dream details in the REM app.";
    // App view URLs are typically not canonical if they are behind auth.
    // The public URL (if one exists) should be the canonical one.
    // If a public version exists: canonicalUrl = `${siteUrl}/dream/${encodeURIComponent(dreamId!)}`; else, no canonical or self.
    canonicalUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/dream/${encodeURIComponent(dreamId!)}`; // Assume public version could exist
    shouldIndexPage = false; // App views are generally not indexed

    return (
      <>
        <Helmet>
          <title>{ogTitle}</title>
          <meta name="description" content={ogDescription} />
          {/* If there's a public equivalent, link to it as canonical. Otherwise, app pages might not set one or set self. */}
          <link rel="canonical" href={canonicalUrl} />
          <meta name="robots" content="noindex, nofollow" />
          {/* No OG tags needed here typically, as these pages shouldn't be shared/scraped directly if they are auth-walled */}
        </Helmet>
        <div className="container mx-auto p-4 max-w-4xl relative">
          {/* ... ALL YOUR EXISTING JSX FOR RENDERING THE APP VIEW DREAM ... */}
          {/* Make sure this part matches what you had before for the app view content. */}
          {/* Example: Dream content, comments section for app view, editing tools etc. */}
        </div>
      </>
    );
  }

  // Fallback if neither public nor app view conditions are met (should ideally not be reached if logic is complete)
  return (
    <>
      <Helmet>
        <title>Loading... | Rem</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <DreamDetailLoadingSkeleton />
    </>
  );
}
