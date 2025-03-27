import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DreamHeaderProps {
  onCreateClick: () => void;
}

export const DreamHeader = ({ onCreateClick }: DreamHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-primary">Dream Journal</h1>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Record Dream
      </Button>
    </div>
  );
};
