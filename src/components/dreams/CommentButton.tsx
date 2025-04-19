import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentButtonProps {
  commentCount: number;
  isLoading?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  size?: "default" | "sm";
  showCount?: boolean;
  className?: string;
}

export const CommentButton = ({
  commentCount = 0,
  isLoading = false,
  onClick,
  size = "default",
  showCount = true,
  className
}: CommentButtonProps) => {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1",
        size === "sm" && "px-2 h-8",
        className
      )}
      disabled={isLoading}
    >
      <MessageSquare className={cn(
        size === "default" ? "h-5 w-5" : "h-4 w-4"
      )} />
      {showCount && commentCount > 0 && (
        <span className={cn(
          "text-sm",
          className
        )}>
          {commentCount}
        </span>
      )}
    </Button>
  );
};

export default CommentButton; 