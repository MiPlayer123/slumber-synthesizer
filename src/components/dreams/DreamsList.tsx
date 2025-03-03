
import React from 'react';
import { Dream, DreamAnalysis } from '@/lib/types';
import { DreamCard } from '@/components/dreams/DreamCard';

interface DreamsListProps {
  dreams: Dream[];
  analyses?: DreamAnalysis[];
  onAnalyze?: (dreamId: string) => void;
  isLoading: boolean;
}

export const DreamsList = ({ dreams, analyses, onAnalyze, isLoading }: DreamsListProps) => {
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
          isPersonalView={true}
        />
      ))}
    </div>
  );
};
