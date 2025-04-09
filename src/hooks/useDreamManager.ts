import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export function useDreamManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatingImageForDreams, setGeneratingImageForDreams] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { track } = useAnalytics();

  const updateGeneratingSet = (dreamId: string, add: boolean) => {
    setGeneratingImageForDreams(prev => {
      const newSet = new Set(prev);
      if (add) {
        newSet.add(dreamId);
      } else {
        newSet.delete(dreamId);
      }
      return newSet;
    });
  };

  const createDream = useMutation({
    mutationFn: async (dream: Dream) => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      toast({
        title: "Dream Created",
        description: "Your dream has been successfully recorded.",
      });

      if (file) {
        uploadMedia.mutate({ dreamId: newDream.id, file });
      } else {
        generateImage.mutate(newDream);
      }
    },
    onError: (error) => {
      console.error('Create dream error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create dream: ${error instanceof Error ? error.message : String(error)}`,
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const generateImage = useMutation({
    mutationFn: async (dream: Dream) => {
      if (!dream || !dream.id) {
        throw new Error("Cannot generate image: Invalid dream data provided.");
      }
      console.log('Generating image for dream:', dream.id);

      updateGeneratingSet(dream.id, true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('generate-dream-image', {
          body: {
            dreamId: dream.id,
            description: `${dream.title} - ${dream.description}`
          },
          headers: sessionData?.session ? {
            Authorization: `Bearer ${sessionData.session.access_token}`
          } : undefined
        });

        if (error) throw error;
        return { data, dreamId: dream.id };
      } catch (err) {
        console.error('Error invoking generate-dream-image function:', err);
        if (err instanceof Error && (err.message?.includes('404') || (err as any).status === 404)) {
          throw new Error('The image generation endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), { dreamId: dream.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      toast({
        title: "Image Generated",
        description: "Dream image has been generated successfully.",
      });
    },
    onError: (error: any, variables) => {
      const dreamId = variables?.id;
      console.error(`Image generation error for dream ${dreamId}:`, error);
      const errorDreamId = error?.dreamId;
      const targetDreamId = dreamId || errorDreamId;

      toast({
        variant: "destructive",
        title: "Error Generating Image",
        description: error instanceof Error ? error.message : "Failed to generate dream image. Please try again.",
      });
    },
    onSettled: (data, error, variables) => {
      const dreamId = variables?.id;
      const errorDreamId = (error as any)?.dreamId;
      const targetDreamId = dreamId || errorDreamId;

      if (targetDreamId) {
        console.log(`Settled image generation for dream ${targetDreamId}, removing from generating set.`);
        updateGeneratingSet(targetDreamId, false);
      } else {
        console.warn("Could not determine dream ID in generateImage.onSettled to clear loading state.");
      }
    }
  });

  const analyzeDream = useMutation({
    mutationFn: async (dreamId: string) => {
      console.log('Analyzing dream:', dreamId);

      const dream = dreams?.find(d => d.id === dreamId);
      if (!dream) throw new Error('Dream not found for analysis');

      setIsAnalyzing(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('analyze-dream', {
          body: {
            dreamId: dream.id,
            dreamContent: `Title: ${dream.title}\n\nDescription: ${dream.description}\n\nCategory: ${dream.category}\n\nEmotion: ${dream.emotion}`
          },
          headers: sessionData?.session ? {
            Authorization: `Bearer ${sessionData.session.access_token}`
          } : undefined
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error invoking analyze-dream function:', err);
        if (err instanceof Error && (err.message?.includes('404') || (err as any).status === 404)) {
          throw new Error('The dream analysis endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
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
    onSettled: () => {
      console.log("Settled dream analysis, resetting isAnalyzing state.");
      setIsAnalyzing(false);
    }
  });

  return {
    dreams,
    isLoading: isLoadingDreams,
    error: dreamsError,
    isCreating,
    isAnalyzing,
    generatingImageForDreams,
    createDream,
    deleteDream,
    generateImage,
    analyzeDream,
    uploadMedia
  };
} 