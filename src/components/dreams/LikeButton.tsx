
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

export function LikeButton({ 
  isLiked, 
  likesCount, 
  onClick, 
  isLoading = false,
  className
}: LikeButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={onClick}
      disabled={isLoading}
    >
      <Heart
        className={cn(
          "h-4 w-4", 
          isLiked ? "fill-destructive text-destructive" : "text-muted-foreground"
        )}
      />
      <span className="font-normal">
        {likesCount} {likesCount === 1 ? "Like" : "Likes"}
      </span>
    </Button>
  );
}
