import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Share, Wand2 } from "lucide-react";
import { Dream, Profile } from "@/lib/types"; // Assuming Profile is also needed or part of Dream
import { useDreamLikes } from "@/hooks/use-dream-likes";
import { useDreamCommentCount } from "@/hooks/use-dream-comments";
import { LikeButton } from "./LikeButton"; // Assuming LikeButton is in the same directory or adjust path
import { CommentButton } from "./CommentButton"; // Assuming CommentButton is in the same directory or adjust path
import { ProfileHoverCard } from "@/components/ui/profile-hover-card";

// Dream type might need to be adjusted if 'profiles' is not directly on it
// For example, if it's Dream & { profiles?: Profile }
export type DreamTileProps = {
  dream: Dream & { profiles?: Pick<Profile, "username" | "avatar_url"> }; // Adjusted based on usePublicDreams and potential useFriendsDreams structure
  onDreamClick: () => void;
  onShare: () => void;
  refreshLikes: (dreamId?: string) => void;
};

export const DreamTile: React.FC<DreamTileProps> = ({
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

  const handleProfileClick = (e: React.MouseEvent, username?: string) => {
    e.stopPropagation();
    if (username) {
      navigate(`/profile/${username}`);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  const handleLikeClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleLike();
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDreamClick(); // This should open the dialog

    // Optional: If you want to scroll to comments inside the dialog after it opens
    // setTimeout(() => {
    //   const commentsElement = document.getElementById("comments-section-in-dialog"); // Ensure your dialog has such an element
    //   if (commentsElement) {
    //     commentsElement.scrollIntoView({ behavior: "smooth" });
    //   }
    // }, 100);
  };
  
  const profile = dream.profiles; // Extracted for convenience

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
          {profile?.username && (
            <ProfileHoverCard username={profile.username}>
              <div
                onClick={(e) => handleProfileClick(e, profile.username)}
                className="cursor-pointer"
              >
                <Avatar className="h-5 w-5 md:h-6 md:w-6 transition-opacity hover:opacity-70">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </ProfileHoverCard>
          )}

          {profile?.username && (
            <ProfileHoverCard username={profile.username}>
              <span
                onClick={(e) => handleProfileClick(e, profile.username)}
                className="text-xs md:text-sm font-medium cursor-pointer transition-colors hover:text-muted-foreground"
              >
                {profile.username}
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
