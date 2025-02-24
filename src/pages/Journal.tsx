
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Dream } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateDreamForm } from "@/components/dreams/CreateDreamForm";
import { DreamCard } from "@/components/dreams/DreamCard";

const Journal = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const createDream = useMutation({
    mutationFn: async (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User must be logged in to create a dream');
      
      const { data, error } = await supabase
        .from('dreams')
        .insert([{ ...dream, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newDream) => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      setIsCreating(false);
      toast({
        title: "Dream Created",
        description: "Your dream has been successfully recorded.",
      });
      
      generateImage.mutate(newDream);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dream",
      });
    },
  });

  const generateImage = useMutation({
    mutationFn: async (dream: Dream) => {
      const { data, error } = await supabase.functions.invoke('generate-dream-image', {
        body: { 
          dreamId: dream.id,
          description: `${dream.title} - ${dream.description}`
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      toast({
        title: "Image Generated",
        description: "Dream image has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate dream image. Please try again.",
      });
    },
  });

  // If still loading auth state, show loading indicator
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Dream Journal</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Dream
        </Button>
      </div>

      {isCreating && <CreateDreamForm onSubmit={createDream.mutate} />}

      <div className="space-y-8 max-w-6xl mx-auto">
        {dreamsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dreams?.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No dreams recorded yet. Start by recording your first dream!
          </p>
        ) : (
          dreams?.map((dream) => (
            <DreamCard key={dream.id} dream={dream} analyses={analyses} />
          ))
        )}
      </div>

      <Dialog
        open={selectedDream !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDream(null);
            setAnalysis(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedDream?.title} - Analysis</DialogTitle>
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
    </div>
  );
};

export default Journal;
