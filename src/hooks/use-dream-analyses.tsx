import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export const useDreamAnalyses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Listen for auth events and trigger refetches
  useEffect(() => {
    // Function to handle sign-in success
    const handleSignInSuccess = () => {
      console.log('Auth sign-in event detected in useDreamAnalyses hook - triggering refetch');
      queryClient.invalidateQueries({ queryKey: ['dream-analyses'] });
    };
    
    // Add event listeners
    window.addEventListener('AUTH_SIGN_IN_SUCCESS', handleSignInSuccess);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('AUTH_SIGN_IN_SUCCESS', handleSignInSuccess);
    };
  }, [queryClient]);
  
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
