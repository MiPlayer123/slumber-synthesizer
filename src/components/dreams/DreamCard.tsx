
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dream, DreamAnalysis } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Brain } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DreamCardProps {
  dream: Dream;
  analyses?: DreamAnalysis[];
}

export const DreamCard = ({ dream, analyses }: DreamCardProps) => {
  const [imageError, setImageError] = useState(false);

  const getImageUrl = async () => {
    try {
      const { data } = supabase
        .storage
        .from('dream-images')
        .getPublicUrl(`${dream.id}.png`);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in getImageUrl:', error);
      return null;
    }
  };

  const dreamAnalysis = analyses?.find(
    (analysis) => analysis.dream_id === dream.id
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl mb-2">{dream.title}</CardTitle>
            <CardDescription>
              {formatDistanceToNow(new Date(dream.created_at), {
                addSuffix: true,
              })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge>{dream.category}</Badge>
            <Badge variant="secondary">{dream.emotion}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg whitespace-pre-wrap">{dream.description}</p>
        {dream.image_url && !imageError && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={dream.image_url}
              alt={dream.title}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="gap-2">
          <Brain className="w-4 h-4" />
          Analyze Dream
        </Button>
      </CardFooter>
    </Card>
  );
};
