
import { useDreamLikes } from '@/hooks/use-dream-likes';
import { LikeButton } from '@/components/dreams/LikeButton';

interface DreamLikeButtonProps {
  dreamId: string;
  className?: string;
  onSuccess?: () => void;
}

export const DreamLikeButton = ({ dreamId, className, onSuccess }: DreamLikeButtonProps) => {
  const { likesCount, hasLiked, toggleLike, isLoading } = useDreamLikes(dreamId, onSuccess);

  return (
    <LikeButton
      isLiked={hasLiked}
      likesCount={likesCount}
      onClick={toggleLike}
      isLoading={isLoading}
      className={className}
      showCount={true}
    />
  );
};
