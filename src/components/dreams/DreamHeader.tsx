
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DreamHeaderProps {
  onCreateClick: () => void;
}

export const DreamHeader = ({ onCreateClick }: DreamHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-4xl font-bold text-primary">Dream Journal</h1>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Record Dream
      </Button>
    </div>
  );
};
