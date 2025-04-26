import React from 'react';
import { Dream, DreamAnalysis } from '@/lib/types';
import { DreamCard } from '@/components/dreams/DreamCard';
import { LikeButton } from '@/components/dreams/LikeButton';
import { useDreamLikes } from '@/hooks/use-dream-likes';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface DreamsListProps {
  dreams: Dream[];
  analyses?: DreamAnalysis[];
  onAnalyze?: (dreamId: string) => void;
  onEdit?: (dreamId: string) => void;
  onDelete?: (dreamId: string) => void;
  onGenerateImage?: (dream: Dream) => void;
  isLoading: boolean;
  generatingImageForDreams?: Set<string>;
  showLikeButtons?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  infiniteScroll?: boolean;
}

export const DreamsList = ({
  dreams,
  analyses,
  onAnalyze,
  onEdit,
  onDelete,
  onGenerateImage,
  isLoading,
  generatingImageForDreams = new Set(),
  showLikeButtons = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  fetchNextPage,
  infiniteScroll = false
}: DreamsListProps) => {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const lastDreamRef = React.useCallback(
    (node: HTMLDivElement) => {
      if (isFetchingNextPage || !infiniteScroll) return;
      if (observerRef.current) observerRef.current.disconnect();
      
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && fetchNextPage) {
          fetchNextPage();
        }
      }, { threshold: 0.5 });
      
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage, infiniteScroll]
  );

  if (isLoading && dreams.length === 0) {
    return <p className="text-center text-muted-foreground">Loading dreams...</p>;
  }

  if (dreams?.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No dreams recorded yet. Start by recording your first dream!
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {dreams?.map((dream, index) => (
        <div 
          key={dream.id}
          ref={infiniteScroll && index === dreams.length - 1 ? lastDreamRef : undefined}
        >
          <DreamCard 
            dream={dream} 
            analyses={analyses} 
            onAnalyze={onAnalyze}
            onEdit={onEdit}
            onDelete={onDelete}
            onGenerateImage={onGenerateImage}
            isPersonalView={true}
            isGeneratingImage={generatingImageForDreams.has(dream.id)}
          />
        </div>
      ))}
      {isFetchingNextPage && (
        <p className="text-center text-muted-foreground py-4">Loading more dreams...</p>
      )}
    </div>
  );
};
