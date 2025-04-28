import { Dream, DreamAnalysis } from "@/lib/types";
import {
  Sparkles,
  Wand2,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DreamCardProps {
  dream: Dream;
  analyses?: DreamAnalysis[];
  onAnalyze?: (dreamId: string) => void;
  onEdit?: (dreamId: string) => void;
  onDelete?: (dreamId: string) => void;
  isPersonalView?: boolean;
  isGeneratingImage?: boolean;
}

export const DreamCard = ({
  dream,
  analyses,
  onAnalyze,
  onEdit,
  onDelete,
  isPersonalView = false,
  isGeneratingImage = false,
}: DreamCardProps) => {
  const { subscription, remainingUsage, refreshSubscription, isUsageLoading } =
    useSubscription();
  const analysis = analyses?.find((a) => a.dream_id === dream.id);
  const needsAnalysis = isPersonalView && !analysis && onAnalyze;
  const hasImage = !!dream.image_url;
  // Generate image is loading when isGeneratingImage is true and no image exists yet
  const isImageLoading = isGeneratingImage && !hasImage;

  // Calculate disabled state for analysis button:
  // • still loading usage (first time) ⇒ disabled
  // • premium ⇒ never disabled
  // • free tier ⇒ disabled if limit reached
  const isAnalysisDisabled = (() => {
    if (subscription?.status === "active") {
      return false;
    }
    // First-time loading: disable until we know quota
    if (remainingUsage === null && isUsageLoading) {
      return true;
    }
    // We've loaded at least once, rely on current quota value
    return (remainingUsage?.dreamAnalyses ?? 0) <= 0;
  })();

  // Handler with additional safety check
  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Skip if disabled
    if (isAnalysisDisabled) {
      return;
    }

    // As a last-resort guard, re-fetch usage before proceeding for free tier users
    if (subscription?.status !== "active") {
      await refreshSubscription();
      // Safely check remainingUsage which could still be null
      if ((remainingUsage?.dreamAnalyses ?? 0) <= 0) {
        return;
      }
    }

    onAnalyze?.(dream.id);
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Image (or image loading state) or description with themes underneath */}
          <div className="flex flex-col space-y-6">
            {/* Image area */}
            {hasImage ? (
              // When an image exists, show it
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <img
                  src={dream.image_url}
                  alt={dream.title}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : isImageLoading ? (
              // When image is generating, show loading state only in image area
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/30 flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  Generating dream image...
                </p>
                <Progress className="w-3/4" value={undefined} />
              </div>
            ) : (
              // When no image and not generating, show description in left column
              <>
                <div className="flex-grow">
                  <h2 className="text-2xl font-bold mb-3">{dream.title}</h2>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {dream.description}
                  </p>
                </div>

                {/* Show themes underneath the description when no image */}
                {analysis && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Themes & Symbols</h4>
                      <div className="flex">
                        {Array.from({ length: analysis.rating }).map((_, i) => (
                          <Sparkles
                            key={i}
                            className="h-4 w-4 text-yellow-500"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.themes.map((theme) => (
                        <Badge key={theme} variant="secondary">
                          ✨ {theme}
                        </Badge>
                      ))}
                      {analysis.symbols.map((symbol) => (
                        <Badge key={symbol} variant="outline">
                          🔮 {symbol}
                        </Badge>
                      ))}
                      {analysis.emotions.map((emotion) => (
                        <Badge key={emotion} variant="default">
                          💭 {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Themes section - Only visible on desktop when image exists */}
            {hasImage && analysis && (
              <div className="hidden md:block space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Themes & Symbols</h4>
                  <div className="flex">
                    {Array.from({ length: analysis.rating }).map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-yellow-500" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.themes.map((theme) => (
                    <Badge key={theme} variant="secondary">
                      ✨ {theme}
                    </Badge>
                  ))}
                  {analysis.symbols.map((symbol) => (
                    <Badge key={symbol} variant="outline">
                      🔮 {symbol}
                    </Badge>
                  ))}
                  {analysis.emotions.map((emotion) => (
                    <Badge key={emotion} variant="default">
                      💭 {emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Dream details and analysis */}
          <div className="space-y-8">
            {hasImage || isImageLoading ? (
              // When image exists or is loading, show title and date at the top
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{dream.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(dream.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                      {dream.category}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                      {dream.emotion}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {dream.description}
                </p>
              </div>
            ) : (
              // When no image exists and not generating, just show date and categories
              <div>
                <div className="flex justify-between items-start mb-6">
                  <p className="text-sm text-muted-foreground">
                    {new Date(dream.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                      {dream.category}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                      {dream.emotion}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-2xl font-semibold">Dream Analysis</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {analysis.interpretation}
                </p>
              </div>
            )}

            {/* Action Buttons - Only shown for personal dreams */}
            {isPersonalView && (
              <div className="flex justify-end gap-2 mt-8">
                {needsAnalysis && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={handleAnalyze}
                            variant={
                              isAnalysisDisabled ? "outline" : "secondary"
                            }
                            className="rounded-full"
                            size="sm"
                            disabled={isAnalysisDisabled}
                          >
                            {isAnalysisDisabled ? (
                              <>
                                <Lock className="mr-1 h-4 w-4 text-gray-400" />
                                <span className="text-gray-400">
                                  Analyze Dream
                                </span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-1 h-4 w-4" />
                                Analyze Dream
                              </>
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {isAnalysisDisabled &&
                        remainingUsage !== null &&
                        remainingUsage.dreamAnalyses <= 0 && (
                          <TooltipContent className="bg-gray-700 text-gray-100 border-gray-600 p-3 max-w-xs">
                            <p>
                              You've reached your free limit of 7 dream analyses
                              this week. Upgrade to premium for unlimited
                              analyses.
                            </p>
                          </TooltipContent>
                        )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Replace Edit and Delete buttons with a dropdown menu */}
                {(onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-8 w-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(dream.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(dream.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Themes section - Only visible on mobile when image exists */}
            {hasImage && analysis && (
              <div className="md:hidden space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Themes & Symbols</h4>
                  <div className="flex">
                    {Array.from({ length: analysis.rating }).map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-yellow-500" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.themes.map((theme) => (
                    <Badge key={theme} variant="secondary">
                      ✨ {theme}
                    </Badge>
                  ))}
                  {analysis.symbols.map((symbol) => (
                    <Badge key={symbol} variant="outline">
                      🔮 {symbol}
                    </Badge>
                  ))}
                  {analysis.emotions.map((emotion) => (
                    <Badge key={emotion} variant="default">
                      💭 {emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
