import { useDreamLikes } from "@/hooks/use-dream-likes";
import { LikeButton } from "@/components/dreams/LikeButton";
import { useEffect, useState } from "react";

interface DreamLikeButtonProps {
  dreamId: string;
  className?: string;
  onSuccess?: () => void;
}

export const DreamLikeButton = ({
  dreamId,
  className,
  onSuccess,
}: DreamLikeButtonProps) => {
  const [isClicking, setIsClicking] = useState(false);
  const { likesCount, hasLiked, toggleLike, isLoading } = useDreamLikes(
    dreamId,
    onSuccess,
  );

  // Keep a local state synced with the hook's state to ensure UI updates
  const [localHasLiked, setLocalHasLiked] = useState(hasLiked);

  // Update local state when the hook's state changes
  useEffect(() => {
    setLocalHasLiked(hasLiked);
  }, [hasLiked]);

  const handleClick = () => {
    // Prevent rapid clicking
    if (isClicking || isLoading) return;

    setIsClicking(true);

    // Optimistically update local state for immediate feedback
    setLocalHasLiked(!localHasLiked);

    // Call the actual toggle function
    toggleLike();

    // Reset clicking state after a short delay
    setTimeout(() => {
      setIsClicking(false);
    }, 300);
  };

  return (
    <LikeButton
      isLiked={localHasLiked}
      likesCount={likesCount}
      onClick={handleClick}
      isLoading={isLoading || isClicking}
      className={className}
      showCount={true}
    />
  );
};
