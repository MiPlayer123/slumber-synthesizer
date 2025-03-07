import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export const useDreams = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Listen for auth events and trigger refetches
  useEffect(() => {
    // Function to handle sign-in success
    const handleSignInSuccess = () => {
      console.log('Auth sign-in event detected in useDreams hook - triggering refetch');
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['dreams', userId] });
      }
    };
    
    // Add event listeners
    window.addEventListener('AUTH_SIGN_IN_SUCCESS', handleSignInSuccess);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('AUTH_SIGN_IN_SUCCESS', handleSignInSuccess);
    };
  }, [userId, queryClient]);
  
  return useQuery({
    queryKey: ['dreams', userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log('Fetching dreams for user:', userId);
      
      if (!userId) {
        console.error('No user ID available for fetching dreams');
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dreams:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log('Successfully fetched dreams:', data);
      return data as Dream[];
    },
    refetchOnMount: 'always',
    staleTime: 0
  });
};
