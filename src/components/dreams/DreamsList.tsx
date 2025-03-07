
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
  isLoading: boolean;
  generatingImageForDreams?: Set<string>;
  showLikeButtons?: boolean;
}

export const DreamsList = ({
  dreams,
  analyses,
  onAnalyze,
  onEdit,
  onDelete,
  isLoading,
  generatingImageForDreams = new Set(),
  showLikeButtons = false
}: DreamsListProps) => {
  if (isLoading) {
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
      {dreams?.map((dream) => (
        <DreamCard 
          key={dream.id} 
          dream={dream} 
          analyses={analyses} 
          onAnalyze={onAnalyze}
          onEdit={onEdit}
          onDelete={onDelete}
          isPersonalView={true}
          isGeneratingImage={generatingImageForDreams.has(dream.id)}
        />
      ))}
    </div>
  );
};
