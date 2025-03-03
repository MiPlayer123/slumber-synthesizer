import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Wand2 } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!user) {
    console.log("No user found, redirecting to auth page");
    toast({
      variant: "destructive",
      title: "Authentication required",
      description: "Please log in to access your dream journal.",
    });
    return <Navigate to="/auth" replace />;
  }

  const { data: dreams, isLoading } = useQuery({
    queryKey: ['dreams', user.id],
    enabled: !!user,
    queryFn: async () => {
      console.log('Fetching dreams for user:', user.id);
      
      if (!user.id) {
        console.error('No user ID available for fetching dreams');
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dreams:', error);
        throw error;
      }

      console.log('Successfully fetched dreams:', data);
      return data as Dream[];
    },
  });

  const { data: analyses } = useQuery({
    queryKey: ['dream-analyses'],
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
      if (!user) {
        throw new Error('User must be logged in to create a dream');
      }

      console.log('Creating dream:', { ...dream, user_id: user.id });
      
      const { data, error } = await supabase
        .from('dreams')
        .insert([{ ...dream, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating dream:', error);
        throw error;
      }

      console.log('Dream created successfully:', data);
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
      console.error('Mutation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dream",
      });
    },
  });

  const generateImage = useMutation({
    mutationFn: async (dream: Dream) => {
      console.log('Generating image for dream:', dream.id);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-dream-image', {
          body: { 
            dreamId: dream.id,
            description: `${dream.title} - ${dream.description}`
          },
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error invoking generate-dream-image function:', err);
        if (err.message?.includes('404') || err.status === 404) {
          throw new Error('The image generation endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      toast({
        title: "Image Generated",
        description: "Dream image has been generated successfully.",
      });
    },
    onError: (error) => {
      console.error('Image generation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate dream image. Please try again.",
      });
    },
  });

  const analyzeDream = useMutation({
    mutationFn: async (dreamId: string) => {
      console.log('Analyzing dream:', dreamId);
      
      const dream = dreams?.find(d => d.id === dreamId);
      if (!dream) throw new Error('Dream not found');
      
      try {
        setIsAnalyzing(true);
        
        const { data, error } = await supabase.functions.invoke('analyze-dream', {
          body: { 
            dreamId: dream.id,
            dreamContent: `Title: ${dream.title}\n\nDescription: ${dream.description}\n\nCategory: ${dream.category}\n\nEmotion: ${dream.emotion}`
          },
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error invoking analyze-dream function:', err);
        if (err.message?.includes('404') || err.status === 404) {
          throw new Error('The dream analysis endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dream-analyses'] });
      toast({
        title: "Dream Analyzed",
        description: "Your dream has been analyzed successfully.",
      });
    },
    onError: (error) => {
      console.error('Dream analysis error:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze dream. Please try again.",
      });
    },
  });

  const handleAnalyzeDream = (dreamId: string) => {
    analyzeDream.mutate(dreamId);
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

      {isCreating && <CreateDreamForm onSubmit={createDream.mutate} />}

      <div className="space-y-8 max-w-6xl mx-auto">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading dreams...</p>
        ) : dreams?.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No dreams recorded yet. Start by recording your first dream!
          </p>
        ) : (
          dreams?.map((dream) => (
            <DreamCard 
              key={dream.id} 
              dream={dream} 
              analyses={analyses} 
              onAnalyze={handleAnalyzeDream}
              isPersonalView={true}
            />
          ))
        )}
      </div>

      <Dialog
        open={isAnalyzing}
        onOpenChange={(open) => {
          if (!open) {
            setIsAnalyzing(false);
          }
        }}
      >
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
    </div>
  );
};

export default Journal;
