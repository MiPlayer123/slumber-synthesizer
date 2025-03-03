
import { Dream, DreamAnalysis } from "@/lib/types";
import { Sparkles, Wand2, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DreamCardProps {
  dream: Dream;
  analyses?: DreamAnalysis[];
  onAnalyze?: (dreamId: string) => void;
  onEdit?: (dreamId: string) => void;
  isPersonalView?: boolean;
}

export const DreamCard = ({ 
  dream, 
  analyses, 
  onAnalyze, 
  onEdit,
  isPersonalView = false 
}: DreamCardProps) => {
  const analysis = analyses?.find(a => a.dream_id === dream.id);
  const needsAnalysis = isPersonalView && !analysis && onAnalyze;
  const hasImage = !!dream.image_url;

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Image (if exists) or description with themes underneath */}
          <div className="flex flex-col space-y-6">
            {hasImage ? (
              // When an image exists, show it
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <img
                  src={dream.image_url}
                  alt={dream.title}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              // When no image exists, show description and themes
              <div className="flex flex-col space-y-6 h-full">
                <div className="flex-grow">
                  <h2 className="text-2xl font-semibold mb-3">{dream.title}</h2>
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
                          <Sparkles key={i} className="h-4 w-4 text-yellow-500" />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.themes.map((theme) => (
                        <Badge key={theme} variant="secondary">✨ {theme}</Badge>
                      ))}
                      {analysis.symbols.map((symbol) => (
                        <Badge key={symbol} variant="outline">🔮 {symbol}</Badge>
                      ))}
                      {analysis.emotions.map((emotion) => (
                        <Badge key={emotion} variant="default">💭 {emotion}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    <Badge key={theme} variant="secondary">✨ {theme}</Badge>
                  ))}
                  {analysis.symbols.map((symbol) => (
                    <Badge key={symbol} variant="outline">🔮 {symbol}</Badge>
                  ))}
                  {analysis.emotions.map((emotion) => (
                    <Badge key={emotion} variant="default">💭 {emotion}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Dream details and analysis */}
          <div className="space-y-8 relative">
            {hasImage ? (
              // When image exists, show title and date at the top
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">{dream.title}</h2>
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
              // When no image exists, just show date and categories
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
              <div className="absolute bottom-0 right-0 flex gap-2">
                {needsAnalysis && (
                  <Button 
                    onClick={() => onAnalyze(dream.id)} 
                    variant="secondary" 
                    className="rounded-full"
                    size="sm"
                  >
                    <Wand2 className="mr-1 h-4 w-4" />
                    Analyze Dream
                  </Button>
                )}
                
                {onEdit && (
                  <Button 
                    onClick={() => onEdit(dream.id)} 
                    variant="outline" 
                    className="rounded-full"
                    size="sm"
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
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
                    <Badge key={theme} variant="secondary">✨ {theme}</Badge>
                  ))}
                  {analysis.symbols.map((symbol) => (
                    <Badge key={symbol} variant="outline">🔮 {symbol}</Badge>
                  ))}
                  {analysis.emotions.map((emotion) => (
                    <Badge key={emotion} variant="default">💭 {emotion}</Badge>
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
