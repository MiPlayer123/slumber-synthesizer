import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Link as LinkIcon,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Share,
  Clock,
  ThumbsUp,
  ArrowUpDown,
  X,
  Globe,
  Users,
  Lock,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Dream as BaseDream, Profile as ProfileType } from "@/lib/types";

import { useQueryClient } from "@tanstack/react-query";
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { LikeButton } from "@/components/dreams/LikeButton";
import { CommentButton } from "@/components/dreams/CommentButton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DreamLikeButton } from "@/components/dreams/DreamLikeButton";
import { Helmet } from "react-helmet-async";

import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface ExtendedDream extends BaseDream {
  likeCount?: number;
  commentCount?: number;
}

interface PublicProfileResponse {
  profile?: ProfileType & { public_dream_count?: number };
  error?: string;
  visibility?: string;
  requiresAuth?: boolean;
  requiresFriendship?: boolean;
}

// Moved DreamListItemProps and DreamListItem to before UserProfile
interface DreamListItemProps {
  dream: ExtendedDream;
  onClick: () => void;
  refreshLikes: (dreamId?: string) => void;
}

const DreamListItem: React.FC<DreamListItemProps> = ({
  dream,
  onClick,
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

  const handleLikeClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleLike();
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row items-start">
          {dream.image_url && (
            <div className="sm:mr-4 flex-shrink-0 w-full sm:w-24 h-32 sm:h-24 rounded-md overflow-hidden mb-3 sm:mb-0">
              <img
                src={dream.image_url}
                alt={dream.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <h3 className="text-base md:text-lg font-bold mb-1">
              {dream.title}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">
              {dream.description}
            </p>

            <div className="flex flex-wrap gap-1 mb-3">
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

            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center gap-2 md:gap-3">
                <div onClick={(e) => e.stopPropagation()}>
                  <LikeButton
                    isLiked={hasLiked}
                    likesCount={likesCount}
                    onClick={handleLikeClick}
                    isLoading={isLikeLoading}
                    showCount={true}
                    className="text-sm"
                  />
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <CommentButton
                    commentCount={commentCount}
                    isLoading={isCommentCountLoading}
                    onClick={onClick} // Corrected: Pass the onClick prop directly
                    className="text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {format(new Date(dream.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isPublicView = !location.pathname.includes("/app");
  const isOwnProfile = user?.user_metadata?.username === username;

  const [loading, setLoading] = useState(true);
  const [dreamsLoading, setDreamsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<
    | "not_friends"
    | "pending_sent"
    | "pending_received"
    | "friends"
    | "loading"
    | "self"
  >("loading");
  const [isFriendshipActionLoading, setIsFriendshipActionLoading] =
    useState(false);
  const [dreams, setDreams] = useState<ExtendedDream[]>([]);
  const [selectedDream, setSelectedDream] = useState<ExtendedDream | null>(
    null,
  );
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [dreamStats, setDreamStats] = useState({
    totalCount: 0,
    publicCount: 0,
    categories: {} as Record<string, number>,
    emotions: {} as Record<string, number>,
  });
  const [sortOption, setSortOption] = useState<
    "newest" | "oldest" | "most-liked" | "most-commented"
  >("newest");
  const [sortedDreams, setSortedDreams] = useState<ExtendedDream[]>([]);

  const [publicProfileResponse, setPublicProfileResponse] =
    useState<PublicProfileResponse | null>(null);
  const [isLoadingPublicProfile, setIsLoadingPublicProfile] =
    useState(isPublicView);
  const [publicViewError, setPublicViewError] = useState<string | null>(null);
  const [publicPrivacyInfo, setPublicPrivacyInfo] = useState<{
    visibility?: string;
    requiresAuth?: boolean;
    requiresFriendship?: boolean;
  }>({});

  const profileRef = useRef<HTMLDivElement>(null);

  const fetchPublicDreams = useCallback(
    async (userId: string) => {
      try {
        setDreamsLoading(true);
        const { data, error } = await supabase
          .from("dreams")
          .select("*")
          .eq("user_id", userId)
          .eq("visibility", "public")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDreams(data || []);
      } catch (error) {
        console.error("Error fetching dreams for app view:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dreams",
        });
      } finally {
        setDreamsLoading(false);
      }
    },
    [toast],
  );

  const fetchDreamStats = useCallback(async (userId: string) => {
    try {
      const { count: totalCount, error: countError } = await supabase
        .from("dreams")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("visibility", "public");

      if (countError) throw countError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("dreams")
        .select("category")
        .eq("user_id", userId)
        .eq("visibility", "public");

      if (categoriesError) throw categoriesError;

      const { data: emotionsData, error: emotionsError } = await supabase
        .from("dreams")
        .select("emotion")
        .eq("user_id", userId)
        .eq("visibility", "public");

      if (emotionsError) throw emotionsError;

      const categories: Record<string, number> = {};
      categoriesData.forEach((dream) => {
        categories[dream.category] = (categories[dream.category] || 0) + 1;
      });

      const emotions: Record<string, number> = {};
      emotionsData.forEach((dream) => {
        emotions[dream.emotion] = (emotions[dream.emotion] || 0) + 1;
      });

      setDreamStats({
        totalCount: totalCount || 0,
        publicCount: totalCount || 0,
        categories,
        emotions,
      });
    } catch (error) {
      console.error("Error fetching dream stats for app view:", error);
    }
  }, []);

  // HELPER FUNCTIONS FOR PUBLIC VIEW (similar to DreamDetail)
  const handlePublicProfileShare = () => {
    if (!publicProfileResponse?.profile) return;
    const shareUrl = `${window.location.origin}/profile/${username}`;
    const profileData = publicProfileResponse.profile;
    const shareDetails = {
      title: `${profileData.full_name || profileData.username} (@${profileData.username}) | Rem Profile`,
      text:
        profileData.bio?.slice(0, 100) + "..." ||
        `Check out ${profileData.username}'s profile on Rem!`,
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareDetails)) {
      navigator.share(shareDetails).catch(() => copyToClipboard(shareUrl));
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const handleOpenProfileInApp = () => {
    const appUrl = `rem://profile/${username}`;
    window.location.href = appUrl;
    // Optional: Fallback toast if app doesn't open, needs careful implementation
  };

  const handlePublicLoginRedirect = () => {
    navigate("/auth", { state: { from: `/profile/${username}` } });
  };

  // Function to copy to clipboard (can be reused or ensure it exists if not already in scope)
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Profile link copied to clipboard!",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to copy link.",
        });
        console.error("Failed to copy link:", err);
      });
  };
  // END HELPER FUNCTIONS

  useEffect(() => {
    if (!isPublicView || !username) {
      if (isPublicView) setIsLoadingPublicProfile(false);
      return;
    }
    async function fetchPublicProfile() {
      setIsLoadingPublicProfile(true);
      setPublicViewError(null);
      setPublicProfileResponse(null);
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          `get-public-profile`,
          {
            body: { username },
            headers: user
              ? {
                  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                }
              : undefined,
          },
        );
        if (functionError) {
          throw new Error(
            functionError.message || "Error calling profile function.",
          );
        }
        const response = data as PublicProfileResponse;
        setPublicProfileResponse(response);
        if (response.error) {
          setPublicViewError(response.error);
          setPublicPrivacyInfo({
            visibility: response.visibility,
            requiresAuth: response.requiresAuth,
            requiresFriendship: response.requiresFriendship,
          });
        } else if (!response.profile) {
          setPublicViewError("Profile not found or not accessible.");
          setPublicPrivacyInfo({ visibility: "private_profile" });
        }
      } catch (err: any) {
        console.error("Error fetching public profile:", err);
        setPublicViewError(
          err.message || "Failed to load profile. Please try again.",
        );
        setPublicPrivacyInfo({ visibility: "private_profile" });
      } finally {
        setIsLoadingPublicProfile(false);
      }
    }
    fetchPublicProfile();
  }, [username, user, isPublicView, location.key]);

  useEffect(() => {
    if (isPublicView) return; // Only for app view
    const scrollPosition = sessionStorage.getItem(`scroll_${username}`);
    if (scrollPosition && !loading && !dreamsLoading) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPosition));
      }, 100);
      sessionStorage.removeItem(`scroll_${username}`);
    }
  }, [username, loading, dreamsLoading, isPublicView]);

  useEffect(() => {
    if (isPublicView || !profile || !user) {
      // Ensure profile and user are loaded for app view
      if (!isPublicView) setFriendshipStatus("loading"); // Set to loading only if in app view and conditions not met
      return;
    }
    if (profile.id === user.id) {
      setFriendshipStatus("self");
      return;
    }
    const fetchFriendshipStatus = async () => {
      setFriendshipStatus("loading");
      try {
        const { data, error } = await supabase
          .from("friendship")
          .select("*")
          .or(
            `and(user_id.eq.${user.id},friend_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_user_id.eq.${user.id})`,
          )
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setFriendshipStatus("not_friends");
        } else if (data.status === "pending") {
          if (data.user_id === user.id) {
            setFriendshipStatus("pending_sent");
          } else {
            setFriendshipStatus("pending_received");
          }
        } else if (data.status === "accepted") {
          setFriendshipStatus("friends");
        }
      } catch (err) {
        console.error("Error fetching friendship status:", err);
        sonnerToast.error("Failed to load friendship status.");
        setFriendshipStatus("not_friends");
      }
    };
    fetchFriendshipStatus();
  }, [profile, user, isPublicView]);

  useEffect(() => {
    if (isPublicView || !username) {
      setLoading(false); // Ensure loading stops if not applicable
      setDreamsLoading(false);
      return;
    }

    const fetchAppData = async () => {
      try {
        setLoading(true);
        setDreamsLoading(true); // For dreams part of app view

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile(profileData); // This is for app view
          // The existing fetchPublicDreams and fetchDreamStats are tied to profile.id
          // and should reflect the app's view of this user (public or friends-only based on friendship)
          // These might need adjustments if they *only* fetched public for other users.
          // For now, assuming they fetch what the current `user` can see of `profileData.id`.
          await fetchPublicDreams(profileData.id); // Re-evaluate this for app context if needed
          await fetchDreamStats(profileData.id); // Re-evaluate this for app context if needed
        } else {
          setProfile(null); // No profile found for app view
        }
      } catch (error) {
        console.error("Error fetching app profile data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile for app view",
        });
        setProfile(null);
      } finally {
        setLoading(false);
        // dreamsLoading is set within fetchPublicDreams
      }
    };

    fetchAppData();
  }, [username, toast, fetchPublicDreams, fetchDreamStats, isPublicView]); // Dependencies for app data fetching

  useEffect(() => {
    if (isPublicView || !dreams.length) {
      if (!isPublicView) setSortedDreams([]); // Clear for app view if no dreams
      return;
    }
    let sorted = [...dreams];
    switch (sortOption) {
      case "newest":
        sorted = sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "oldest":
        sorted = sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case "most-liked":
        fetchDreamLikeCounts(sorted).then((dreamsWithLikes) => {
          setSortedDreams(
            dreamsWithLikes.sort(
              (a, b) => (b.likeCount || 0) - (a.likeCount || 0),
            ),
          );
        });
        return;
      case "most-commented":
        fetchDreamCommentCounts(sorted).then((dreamsWithComments) => {
          setSortedDreams(
            dreamsWithComments.sort(
              (a, b) => (b.commentCount || 0) - (a.commentCount || 0),
            ),
          );
        });
        return;
    }
    setSortedDreams(sorted);
  }, [dreams, sortOption, isPublicView]);

  const fetchComments = async (dreamId: string) => {
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
  };

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

  const handleShareDream = (dreamId: string) => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Dream link copied to clipboard!",
      });
    });
  };

  const refreshLikes = (dreamId?: string) => {
    if (dreamId) {
      queryClient.invalidateQueries({
        queryKey: ["dream-likes-count", dreamId],
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["dream-likes-count"] });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDream(null);
      refreshLikes();
    }
  };

  const handleDreamClick = (dream: ExtendedDream) => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      sessionStorage.setItem(`scroll_${username}`, window.scrollY.toString());

      navigate(`/dream/${dream.id}/app`, { state: { fromProfile: true } });
    } else {
      setSelectedDream(dream);
      if (dream && dream.id) {
        fetchComments(dream.id);
      }
    }
  };

  const fetchDreamLikeCounts = async (dreamsList: ExtendedDream[]) => {
    if (!dreamsList.length) return dreamsList;

    const dreamsWithLikes = await Promise.all(
      dreamsList.map(async (dream) => {
        try {
          const { count, error } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("dream_id", dream.id);

          if (error) throw error;

          return {
            ...dream,
            likeCount: count || 0,
          };
        } catch (error) {
          console.error(`Error getting likes for dream ${dream.id}:`, error);
          return {
            ...dream,
            likeCount: 0,
          };
        }
      }),
    );

    return dreamsWithLikes;
  };

  const fetchDreamCommentCounts = async (dreamsList: ExtendedDream[]) => {
    if (!dreamsList.length) return dreamsList;

    const dreamsWithComments = await Promise.all(
      dreamsList.map(async (dream) => {
        try {
          const { count, error } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("dream_id", dream.id);

          if (error) throw error;

          return {
            ...dream,
            commentCount: count || 0,
          };
        } catch (error) {
          console.error(`Error getting comments for dream ${dream.id}:`, error);
          return {
            ...dream,
            commentCount: 0,
          };
        }
      }),
    );

    return dreamsWithComments;
  };

  const SortSelect = () => {
    return (
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center">
          <ArrowUpDown className="h-4 w-4 mr-1" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
        </div>
        <Select
          value={sortOption}
          onValueChange={(value) => setSortOption(value as typeof sortOption)}
        >
          <SelectTrigger className="w-[170px] h-8 text-sm whitespace-nowrap">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="min-w-[170px]">
            <SelectItem value="newest" className="whitespace-nowrap">
              <div className="flex items-center w-full">
                <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Newest</span>
              </div>
            </SelectItem>
            <SelectItem value="oldest" className="whitespace-nowrap">
              <div className="flex items-center w-full">
                <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Oldest</span>
              </div>
            </SelectItem>
            <SelectItem value="most-liked" className="whitespace-nowrap">
              <div className="flex items-center w-full">
                <ThumbsUp className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Most Liked</span>
              </div>
            </SelectItem>
            <SelectItem value="most-commented" className="whitespace-nowrap">
              <div className="flex items-center w-full">
                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Most Commented</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const handleProfileNavigation = (username: string) => {
    setSelectedDream(null);
    navigate(`/profile/${username}/app`);
  };

  // RE-INSERTING FRIENDSHIP HANDLERS HERE
  const handleAddFriend = async () => {
    if (!user || !profile || isPublicView) return;
    setIsFriendshipActionLoading(true);
    try {
      const { error } = await supabase.from("friendship").insert({
        user_id: user.id,
        friend_user_id: profile.id,
        status: "pending",
      });
      if (error) throw error;
      setFriendshipStatus("pending_sent");
      sonnerToast.success(`Friend request sent to ${profile.username}`);
    } catch (err) {
      console.error("Error sending friend request:", err);
      sonnerToast.error("Failed to send friend request. Please try again.");
    } finally {
      setIsFriendshipActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!user || !profile || isPublicView) return;
    setIsFriendshipActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendship")
        .update({ status: "accepted" })
        .eq("user_id", profile.id) // The other user sent the request
        .eq("friend_user_id", user.id); // To the current user
      if (error) throw error;
      setFriendshipStatus("friends");
      sonnerToast.success(`You are now friends with ${profile.username}`);
    } catch (err) {
      console.error("Error accepting friend request:", err);
      sonnerToast.error("Failed to accept friend request. Please try again.");
    } finally {
      setIsFriendshipActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !profile || isPublicView) return;
    if (!confirm("Are you sure you want to remove this friend?")) return;
    setIsFriendshipActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendship")
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_user_id.eq.${user.id})`,
        );
      if (error) throw error;
      setFriendshipStatus("not_friends");
      sonnerToast.success(`You are no longer friends with ${profile.username}`);
    } catch (err) {
      console.error("Error removing friend:", err);
      sonnerToast.error("Failed to remove friend. Please try again.");
    } finally {
      setIsFriendshipActionLoading(false);
    }
  };
  // END FRIENDSHIP HANDLERS

  // --- RENDER LOGIC ---
  if (isPublicView) {
    if (isLoadingPublicProfile) {
      return (
        <>
          <Helmet>
            <title>Loading Profile... | Rem</title>
          </Helmet>
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </>
      );
    }

    const errorTitle =
      publicPrivacyInfo.visibility === "private_profile"
        ? "Private Profile"
        : publicPrivacyInfo.visibility === "friends_only_profile"
          ? "Friends Only Profile"
          : "Profile Not Found";

    if (publicViewError || !publicProfileResponse?.profile) {
      return (
        <>
          <Helmet>
            <title>{errorTitle} | Rem</title>
            <meta
              name="description"
              content={
                publicViewError ||
                "This profile could not be found or is not accessible."
              }
            />
          </Helmet>
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <Card className="w-full max-w-md text-center bg-card text-card-foreground">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                  {publicPrivacyInfo.visibility === "private_profile" ? (
                    <Lock className="w-5 h-5 text-gray-600" />
                  ) : publicPrivacyInfo.visibility ===
                    "friends_only_profile" ? (
                    <Users className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Globe className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <h1 className="text-xl font-semibold text-card-foreground">
                  {errorTitle}
                </h1>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {publicViewError ||
                    "This profile is not available or private."}
                </p>
                {publicPrivacyInfo.requiresAuth && (
                  <Button
                    onClick={handlePublicLoginRedirect}
                    className="w-full"
                  >
                    Login to View
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleOpenProfileInApp}
                  className="w-full mt-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Rem App
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (user) navigate(-1);
                    else navigate("/");
                  }}
                  className="w-full mt-2"
                >
                  Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      );
    }

    const pubProfile = publicProfileResponse.profile;
    // Public view JSX with Helmet
    return (
      <>
        <Helmet>
          <title>
            {pubProfile.full_name || pubProfile.username} (@
            {pubProfile.username}) | Rem Profile
          </title>
          <meta
            name="description"
            content={
              pubProfile.bio?.slice(0, 160) + "..." ||
              `${pubProfile.username}'s profile on Rem.`
            }
          />
          <meta
            property="og:title"
            content={`${pubProfile.full_name || pubProfile.username} (@${pubProfile.username}) | Rem Profile`}
          />
          <meta
            property="og:description"
            content={
              pubProfile.bio ||
              `${pubProfile.username} on Rem - AI Dream Journal`
            }
          />
          <meta
            property="og:image"
            content={
              pubProfile.avatar_url || "https://lucidrem.com/default_avatar.png"
            }
          />
          <meta
            property="og:url"
            content={`${window.location.origin}/profile/${pubProfile.username}`}
          />
          <meta property="og:type" content="profile" />
          <meta name="twitter:card" content="summary" />
          <meta
            name="twitter:title"
            content={`${pubProfile.full_name || pubProfile.username} (@${pubProfile.username}) | Rem Profile`}
          />
          <meta
            name="twitter:description"
            content={pubProfile.bio || `${pubProfile.username} on Rem`}
          />
          <meta
            name="twitter:image"
            content={
              pubProfile.avatar_url || "https://lucidrem.com/default_avatar.png"
            }
          />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-6 md:py-12">
            <div className="max-w-3xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => {
                  if (user) navigate(-1);
                  else navigate("/");
                }}
                className="mb-6 flex items-center text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>

              <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
                <div
                  className="bg-gray-200 h-32 md:h-40"
                  style={{
                    backgroundImage: `url(${(pubProfile as ProfileType & { banner_url?: string }).banner_url || "/placeholder_banner.png"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="p-6 md:p-8 text-center -mt-16 md:-mt-20">
                  <Avatar className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 border-4 border-white shadow-md">
                    <AvatarImage
                      src={pubProfile.avatar_url || undefined}
                      alt={pubProfile.username}
                    />
                    <AvatarFallback className="text-4xl">
                      {pubProfile.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {pubProfile.full_name || pubProfile.username}
                  </h1>
                  <p className="text-md text-gray-600 mb-1">
                    @{pubProfile.username}
                  </p>
                  {pubProfile.bio && (
                    <p className="text-sm text-gray-700 my-4 leading-relaxed">
                      {pubProfile.bio}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600 my-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Joined{" "}
                      {format(new Date(pubProfile.created_at), "MMMM yyyy")}
                    </div>
                    {pubProfile.public_dream_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />{" "}
                        {pubProfile.public_dream_count} Public Dreams
                      </div>
                    )}
                  </div>
                  {pubProfile.website && (
                    <div className="flex items-center justify-center gap-1 text-sm text-primary hover:underline mb-6">
                      <LinkIcon className="h-4 w-4" />
                      <a
                        href={
                          pubProfile.website.startsWith("http")
                            ? pubProfile.website
                            : `https://${pubProfile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {pubProfile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex justify-center space-x-3">
                    <Button onClick={handlePublicProfileShare}>
                      <Share className="mr-2 h-4 w-4" /> Share Profile
                    </Button>
                    <Button variant="outline" onClick={handleOpenProfileInApp}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Open in App
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Public Dreams ({dreams.length})
                </h2>
                {dreamsLoading ? (
                  <div className="flex justify-center mt-8">
                    {" "}
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />{" "}
                  </div>
                ) : dreams.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {dreams.map((dream) => (
                      <DreamListItem
                        key={dream.id}
                        dream={dream}
                        onClick={() => navigate(`/dream/${dream.id}`)}
                        refreshLikes={() =>
                          queryClient.invalidateQueries({
                            queryKey: ["dreamLikes", dream.id],
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-600 py-4">
                    This user hasn't shared any dreams publicly yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- App View ---
  if (loading) {
    // App view loading state
    return (
      <>
        <Helmet>
          <title>Loading Profile... | Rem</title>
        </Helmet>
        <div className="container mx-auto py-8 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!profile) {
    // App view profile not found
    return (
      <>
        <Helmet>
          <title>Profile Not Found | Rem</title>
        </Helmet>
        <div className="container mx-auto py-8 text-center">
          <p className="text-lg text-muted-foreground">Profile not found.</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </>
    );
  }

  // App view JSX with Helmet
  return (
    <>
      <Helmet>
        <title>{profile.username || "User Profile"} | Rem</title>
      </Helmet>
      <div className="container mx-auto px-4 py-6 md:py-12" ref={profileRef}>
        <Button
          variant="ghost"
          onClick={() => {
            if (user) navigate(-1);
            else navigate("/");
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold">
            {profile.username}'s Profile
          </h1>
          {!isPublicView && isOwnProfile && (
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center mb-4 md:mb-6">
                  <div className="mb-3 md:mb-4">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24">
                      {profile?.avatar_url ? (
                        <AvatarImage
                          src={profile.avatar_url}
                          alt={profile.username}
                        />
                      ) : (
                        <AvatarFallback>
                          {profile.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>

                  <h2 className="text-xl font-bold mb-2">{profile.username}</h2>
                  {friendshipStatus !== "self" &&
                    friendshipStatus !== "loading" && (
                      <div className="mt-2 mb-4">
                        {friendshipStatus === "not_friends" && (
                          <Button
                            onClick={handleAddFriend}
                            disabled={isFriendshipActionLoading}
                            size="sm"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Friend
                          </Button>
                        )}
                        {friendshipStatus === "pending_sent" && (
                          <Button disabled variant="outline" size="sm">
                            <ClockIcon className="mr-2 h-4 w-4" />
                            Request Sent
                          </Button>
                        )}
                        {friendshipStatus === "pending_received" && (
                          <Button
                            onClick={handleAcceptFriendRequest}
                            disabled={isFriendshipActionLoading}
                            size="sm"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Accept Request
                          </Button>
                        )}
                        {friendshipStatus === "friends" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFriend}
                            disabled={isFriendshipActionLoading}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Friends
                          </Button>
                        )}
                        {isFriendshipActionLoading && (
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        )}
                      </div>
                    )}
                </div>

                <div className="space-y-4 md:space-y-6">
                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Bio
                      </h3>
                      <p className="text-sm">{profile.bio}</p>
                    </div>
                  )}

                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Joined{" "}
                        {new Date(
                          profile?.created_at || "",
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    {profile.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={
                            profile.website.startsWith("http")
                              ? profile.website
                              : `https://${profile.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline overflow-hidden text-ellipsis break-all"
                        >
                          {profile.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle>Dream Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Dreams Shared</h3>
                    <p className="text-2xl font-bold">
                      {dreamStats.publicCount}
                    </p>
                  </div>

                  {Object.keys(dreamStats.categories).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Top Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(dreamStats.categories)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([category, count]) => (
                            <span
                              key={category}
                              className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                            >
                              {category} ({count})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(dreamStats.emotions).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Common Emotions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(dreamStats.emotions)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([emotion, count]) => (
                            <span
                              key={emotion}
                              className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                            >
                              {emotion} ({count})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="flex justify-between items-center flex-wrap gap-2">
                  <span>{profile?.username}'s Dreams</span>
                  {dreams.length > 1 && <SortSelect />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                {dreamsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : sortedDreams.length > 0 ? (
                  <div className="space-y-4 md:space-y-8">
                    {sortedDreams.map((dream) => (
                      <DreamListItem
                        key={dream.id}
                        dream={dream}
                        onClick={() => handleDreamClick(dream)}
                        refreshLikes={refreshLikes}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    This user hasn't shared any public dreams yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

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
              View dream details and comments
            </DialogDescription>

            {selectedDream && (
              <div className="flex flex-col md:flex-row h-[90vh] md:h-auto overflow-hidden">
                <div
                  className="md:w-3/5 bg-black flex items-center justify-center"
                  style={{
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
                      <p className="text-muted-foreground">
                        No image available
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:w-2/5 flex flex-col h-full max-h-[600px] overflow-hidden">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {profile?.avatar_url ? (
                            <AvatarImage
                              src={profile.avatar_url}
                              alt={profile.username}
                            />
                          ) : (
                            <AvatarFallback>
                              {(
                                profile?.username?.charAt(0) || "U"
                              ).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium">{profile?.username}</span>
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
                          <Badge variant="outline">
                            {selectedDream.emotion}
                          </Badge>
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
                                          src={
                                            comment.profiles?.avatar_url || ""
                                          }
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
                      {selectedDream && (
                        <DreamLikeButton
                          dreamId={selectedDream.id}
                          onSuccess={() => refreshLikes(selectedDream.id)}
                        />
                      )}

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
                          style={{ fontSize: "16px" }}
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
    </>
  );
};
