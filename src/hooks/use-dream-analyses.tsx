import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useDreamAnalyses = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ["dream-analyses", user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      try {
        // First try with user_id column (the proper way)
        const { data, error } = await supabase
          .from("dream_analyses")
          .select("*")
          .eq("user_id", user.id);

        // If there's an error about missing user_id column
        if (
          error &&
          error.code === "42703" &&
          error.message.includes("user_id")
        ) {
          console.log(
            "Attempting alternative query because user_id column may be missing",
          );

          // Try a join with the dreams table as a workaround
          const { data: joinData, error: joinError } = await supabase
            .from("dream_analyses")
            .select(
              `
              id,
              dream_id,
              interpretation,
              rating,
              themes,
              symbols,
              emotions,
              created_at,
              updated_at,
              dreams!inner(user_id)
            `,
            )
            .eq("dreams.user_id", user.id);

          if (joinError) {
            console.error(
              "Error with alternative dream analyses query:",
              joinError,
            );
            toast({
              variant: "destructive",
              title: "Database Error",
              description:
                "Could not load your dream analyses. The database may need to be fixed.",
            });

            // Display helpful information about fixing the database
            toast({
              variant: "destructive",
              title: "Database Fix Needed",
              description:
                "Please run the fix_dream_analyses.sh script from the project root to fix this issue.",
            });

            throw joinError;
          }

          return joinData || [];
        }

        if (error) {
          console.error("Error fetching dream analyses:", error);
          toast({
            variant: "destructive",
            title: "Error Loading Analyses",
            description: error.message,
          });
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error("Exception in useDreamAnalyses:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Analyses",
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    refetchOnMount: "always",
    staleTime: 0,
    enabled: !!user,
  });
};
