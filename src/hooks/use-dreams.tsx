import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Profile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export const useDreams = (userId: string | undefined) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["dreams", userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log("Fetching dreams for user:", userId);

      if (!userId) {
        console.error("No user ID available for fetching dreams");
        throw new Error("User ID is required");
      }

      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching dreams:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log("Successfully fetched dreams:", data);
      return data as Dream[];
    },
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

// New hook for paginated dreams
interface PaginatedDreamsResult {
  dreams: Dream[];
  nextPage: number | undefined;
  page: number;
}

export const usePaginatedDreams = (
  userId: string | undefined,
  pageSize: number = 10,
) => {
  const { toast } = useToast();

  return useInfiniteQuery<PaginatedDreamsResult, Error>({
    queryKey: ["paginatedDreams", userId, pageSize],
    initialPageParam: 0,
    enabled: !!userId,
    queryFn: async ({ pageParam }) => {
      console.log(
        "Fetching paginated dreams for user:",
        userId,
        "page:",
        pageParam,
        "pageSize:",
        pageSize,
      );

      if (!userId) {
        console.error("No user ID available for fetching dreams");
        throw new Error("User ID is required");
      }

      const from = Number(pageParam) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching paginated dreams:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log("Successfully fetched paginated dreams:", data);
      return {
        dreams: data as Dream[],
        nextPage: data.length === pageSize ? Number(pageParam) + 1 : undefined,
        page: Number(pageParam),
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

// Hook for paginated public dreams (for the Dream Wall)
interface PaginatedPublicDreamsResult {
  dreams: Dream[];
  nextPage: number | undefined;
  page: number;
}

export const usePublicDreams = (pageSize: number = 20) => {
  const { toast } = useToast();

  return useInfiniteQuery<PaginatedPublicDreamsResult, Error>({
    queryKey: ["paginatedPublicDreams", pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      console.log(
        "Fetching paginated public dreams - page:",
        pageParam,
        "pageSize:",
        pageSize,
      );

      const from = Number(pageParam) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("dreams")
        .select(
          `
          *,
          profiles:user_id (
            id, 
            username,
            avatar_url,
            full_name,
            created_at,
            updated_at
          )
        `,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching paginated public dreams:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log("Successfully fetched paginated public dreams:", data);
      return {
        dreams: data as Dream[],
        nextPage: data.length === pageSize ? Number(pageParam) + 1 : undefined,
        page: Number(pageParam),
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

// Hook for paginated community dreams (streamlined for the Community page)
interface PaginatedCommunityDreamsResult {
  dreams: (Dream & { profiles: Pick<Profile, "username" | "avatar_url"> })[];
  nextPage: number | undefined;
  page: number;
}

export const useCommunityDreams = (pageSize: number = 10) => {
  const { toast } = useToast();

  return useInfiniteQuery<PaginatedCommunityDreamsResult, Error>({
    queryKey: ["paginatedCommunityDreams", pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      console.log(
        "Fetching paginated community dreams - page:",
        pageParam,
        "pageSize:",
        pageSize,
      );

      const from = Number(pageParam) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("dreams")
        .select(
          `
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching paginated community dreams:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Community Dreams",
          description: error.message,
        });
        throw error;
      }

      console.log("Raw data from Supabase:", JSON.stringify(data, null, 2));

      // Ensure each dream has a valid profile object
      const processedData = data.map((dream) => {
        console.log("Processing dream:", dream.id, "Profile:", dream.profiles);
        return {
          ...dream,
          profiles: dream.profiles || {
            username: "Anonymous",
            avatar_url: null,
          },
        };
      });

      console.log("Processed data:", JSON.stringify(processedData, null, 2));
      return {
        dreams: processedData as (Dream & {
          profiles: Pick<Profile, "username" | "avatar_url">;
        })[],
        nextPage:
          processedData.length === pageSize ? Number(pageParam) + 1 : undefined,
        page: Number(pageParam),
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};
