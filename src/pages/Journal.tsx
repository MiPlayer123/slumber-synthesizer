
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Dream } from "@/lib/types";
import { Navigate } from "react-router-dom";
import { CreateDreamForm } from "@/components/dreams/CreateDreamForm";
import { DreamList } from "@/components/dreams/DreamList";
import { DreamAnalysisDialog } from "@/components/dreams/DreamAnalysisDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDreams } from "@/hooks/use-dreams";

const Journal = () => {
  const { user, loading: authLoading } = useAuth();
  const { createDream } = useDreams();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: dreams, isLoading: dreamsLoading } = useQuery({
    queryKey: ['dreams', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Dream[];
    },
  });

  const { data: analyses } = useQuery({
    queryKey: ['dream-analyses'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dream_analyses')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  if (authLoading) {
    return <LoadingSpinner text="Loading authentication..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateDream = async (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    await createDream.mutateAsync(dream);
    setIsCreating(false);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Dream Journal</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Dream
        </Button>
      </div>

      {isCreating && <CreateDreamForm onSubmit={handleCreateDream} />}

      <DreamList 
        dreams={dreams ?? []} 
        analyses={analyses} 
        isLoading={dreamsLoading} 
      />

      <DreamAnalysisDialog
        dream={selectedDream}
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDream(null);
            setAnalysis(null);
          }
        }}
      />
    </div>
  );
};

export default Journal;
