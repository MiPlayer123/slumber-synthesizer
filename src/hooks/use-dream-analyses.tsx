import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDreamAnalyses = () => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['dream-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dream_analyses')
        .select('*');

      if (error) {
        toast({
          variant: "destructive",
          title: "Error Loading Analyses",
          description: error.message,
        });
        throw error;
      }
      
      return data;
    },
    refetchOnMount: 'always',
    staleTime: 0
  });
};
