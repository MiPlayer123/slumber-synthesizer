import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2 } from "lucide-react";

interface AnalyzingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnalyzingDialog = ({
  isOpen,
  onOpenChange,
}: AnalyzingDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Analyzing Dream</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Wand2 className="h-8 w-8 animate-pulse text-primary" />
            <p className="text-muted-foreground">Analyzing your dream...</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
