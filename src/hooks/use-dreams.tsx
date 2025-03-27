import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export const useDreams = (userId: string | undefined) => {
  const { toast } = useToast();
  
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

// New hook for paginated dreams
interface PaginatedDreamsResult {
  dreams: Dream[];
  nextPage: number | undefined;
  page: number;
}

export const usePaginatedDreams = (userId: string | undefined, pageSize: number = 10) => {
  const { toast } = useToast();
  
  return useInfiniteQuery<PaginatedDreamsResult, Error>({
    queryKey: ['paginatedDreams', userId, pageSize],
    initialPageParam: 0,
    enabled: !!userId,
    queryFn: async ({ pageParam }) => {
      console.log('Fetching paginated dreams for user:', userId, 'page:', pageParam, 'pageSize:', pageSize);
      
      if (!userId) {
        console.error('No user ID available for fetching dreams');
        throw new Error('User ID is required');
      }

      const from = Number(pageParam) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching paginated dreams:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log('Successfully fetched paginated dreams:', data);
      return { 
        dreams: data as Dream[], 
        nextPage: data.length === pageSize ? Number(pageParam) + 1 : undefined,
        page: Number(pageParam)
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnMount: 'always',
    staleTime: 0
  });
};
