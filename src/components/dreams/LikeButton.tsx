
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({ 
  isLiked, 
  likesCount, 
  onClick, 
  isLoading = false,
  className,
  showCount = true
}: LikeButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("px-2 h-8 hover:bg-transparent", className)}
      onClick={onClick}
      disabled={isLoading}
    >
      <Heart
        className={cn(
          "h-5 w-5 mr-1.5", 
          isLiked ? "fill-destructive text-destructive" : "text-foreground"
        )}
      />
      {showCount && (
        <span className="font-normal text-sm">
          {likesCount}
        </span>
      )}
    </Button>
  );
}
