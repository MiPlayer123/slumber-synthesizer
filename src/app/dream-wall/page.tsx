"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dream } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DreamTile } from "@/components/dreams/DreamTile";
import { DreamCard } from "@/components/dreams/DreamCard";
import { useInView } from "react-intersection-observer";
import { DreamHeader } from "@/components/dreams/DreamHeader";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const DreamWall = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const router = useRouter();
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();

  const fetchDreams = async ({ pageParam = 0 }) => {
    const { data, error } = await supabase
      .from("dreams")
      .select(
        `
        *,
        profiles (
          username,
          avatar_url
        )
      `,
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(pageParam, pageParam + 9); // Fetch 10 dreams per page

    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["dreams"],
    queryFn: fetchDreams,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  useEffect(() => {
    if (data) {
      const allDreams = data.pages.flat();
      setDreams(allDreams);
    }
  }, [data]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const handleDreamClick = (dream: Dream) => {
    setSelectedDream(dream);
  };

  const handleProfileNavigation = (username?: string) => {
    if (username) {
      router.push(`/profile/${username}`);
    }
  };

  const handleShare = () => {
    toast({ title: "Shared!", description: "Your dream has been shared." });
  };

  const refreshLikes = () => {
    queryClient.invalidateQueries({ queryKey: ["dreams"] });
  };

  return (
    <>
      <Helmet>
        <title>Dream Wall - Slumber Synthesizer</title>
        <meta
          name="description"
          content="Explore a wall of dreams from the community. See what others are dreaming about."
        />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <DreamHeader onCreateClick={() => {}} isCreating={false} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {dreams.map((dream) => (
            <DreamTile
              key={dream.id}
              dream={dream}
              onDreamClick={() => handleDreamClick(dream)}
              onShare={handleShare}
              refreshLikes={refreshLikes}
              onProfileClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (dream.profiles?.username) {
                  handleProfileNavigation(dream.profiles.username);
                }
              }}
            />
          ))}
        </div>

        <div ref={ref} className="text-center py-4">
          {isFetchingNextPage
            ? "Loading more..."
            : hasNextPage
              ? "Load More"
              : "Nothing more to load"}
        </div>

        <AnimatePresence>
          {selectedDream && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
              onClick={() => setSelectedDream(null)}
            >
              <div
                className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <DreamCard dream={selectedDream} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default DreamWall;
