
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dream } from "@/lib/types";

interface DreamAnalysisDialogProps {
  dream: Dream | null;
  analysis: string | null;
  isAnalyzing: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DreamAnalysisDialog = ({
  dream,
  analysis,
  isAnalyzing,
  onOpenChange,
}: DreamAnalysisDialogProps) => {
  return (
    <Dialog
      open={dream !== null}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dream?.title} - Analysis</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground animate-pulse">Analyzing your dream...</p>
            </div>
          ) : analysis ? (
            <pre className="prose prose-sm dark:prose-invert max-w-none">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">Failed to load analysis.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
