
import { Dream, DreamAnalysis } from "@/lib/types";
import { DreamCard } from "./DreamCard";

interface DreamListProps {
  dreams: Dream[];
  analyses?: DreamAnalysis[];
  isLoading: boolean;
}

export const DreamList = ({ dreams, analyses, isLoading }: DreamListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (dreams.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No dreams recorded yet. Start by recording your first dream!
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {dreams.map((dream) => (
        <DreamCard key={dream.id} dream={dream} analyses={analyses} />
      ))}
    </div>
  );
};
