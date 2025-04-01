import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface DreamHeaderProps {
  onCreateClick: () => void;
  isCreating: boolean;
}

export const DreamHeader = ({ onCreateClick, isCreating }: DreamHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-primary">Dream Journal</h1>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        {isCreating ? (
          <>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Record Dream
          </>
        )}
      </Button>
    </div>
  );
};
