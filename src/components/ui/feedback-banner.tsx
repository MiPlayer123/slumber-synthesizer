import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FeedbackBannerProps {
  feedbackUrl: string;
  className?: string;
}

export function FeedbackBanner({ feedbackUrl, className }: FeedbackBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground py-1 px-2 z-50 flex items-center justify-between shadow-lg",
        className
      )}
    >
      <div className="flex-1 text-center">
        <span className="mr-2">Found a bug or having an issue?</span>
        <a 
          href={feedbackUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-medium underline underline-offset-4 hover:text-primary-foreground/90"
        >
          Let us know
        </a>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsVisible(false)}
        className="text-primary-foreground hover:bg-primary-foreground/10"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
} 