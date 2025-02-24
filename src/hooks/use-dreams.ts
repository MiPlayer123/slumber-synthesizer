
import { Dream } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDreams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDream = useMutation({
    mutationFn: async (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User must be logged in to create a dream');
      
      const { data, error } = await supabase
        .from('dreams')
        .insert([{ ...dream, user_id: userData.user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newDream) => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
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
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-dream-image', {
        body: { 
          dreamId: dream.id,
          description: `${dream.title} - ${dream.description}`
        },
      });

      if (functionError) throw functionError;

      const { data } = supabase
        .storage
        .from('dream-images')
        .getPublicUrl(`${dream.id}.png`);

      const { error: updateError } = await supabase
        .from('dreams')
        .update({ image_url: data.publicUrl })
        .eq('id', dream.id);

      if (updateError) throw updateError;

      return functionData;
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
      console.error('Image generation error:', error);
    },
  });

  return {
    createDream,
    generateImage,
  };
};
