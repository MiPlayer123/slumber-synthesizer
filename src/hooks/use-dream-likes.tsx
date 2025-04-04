import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectionManager } from "@/services/connectionManager";

// Debug mode - set to false to disable all console logs
const DEBUG_MODE = false;

// Helper function for conditional logging
const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

export function useDreamLikes(dreamId: string, onSuccess?: () => void) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasLiked, setHasLiked] = useState(false);
  const isFirstRender = useRef(true);
  const previousLikeState = useRef(false);
  const channelRef = useRef<any>(null);
  
  // Only proceed with valid dreamId to prevent malformed queries
  const isValidDreamId = !!dreamId && dreamId.trim() !== '';
  
  // Fetch likes count
  const { data: likesCount = 0, isLoading: isLikesLoading, refetch } = useQuery({
    queryKey: ['dream-likes-count', dreamId],
    queryFn: async () => {
      // Skip the query if dreamId is invalid
      if (!isValidDreamId) return 0;
      
      debugLog(`Fetching likes count for dream: ${dreamId}`);
      try {
        const { count, error } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('dream_id', dreamId);
          
        if (error) {
          console.error('Error fetching likes count:', error);
          throw error;
        }
        debugLog(`Got ${count} likes for dream: ${dreamId}`);
        return count || 0;
      } catch (err) {
        console.error('Exception fetching likes count:', err);
        throw err;
      }
    },
    // Only refetch if we have a valid dreamId
    enabled: isValidDreamId,
    // Use shorter stale time to refresh data more frequently
    staleTime: 1000 * 10, // 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Add retry function to handle connection issues
    retry: (failureCount, error) => {
      // If connection is known to be offline, don't retry immediately
      if (!connectionManager.isOnline()) {
        debugLog('Connection is offline, will retry when back online');
        return false;
      }
      return failureCount < 3; // Otherwise retry up to 3 times
    },
  });

  // Check if current user has liked this dream
  const checkLikeStatus = useCallback(async () => {
    if (!user || !isValidDreamId) {
      setHasLiked(false);
      return;
    }
    
    try {
      debugLog(`Checking like status for user: ${user.id}, dream: ${dreamId}`);
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking like status:', error);
        return;
      }
      
      const liked = !!data;
      debugLog(`User has ${liked ? 'liked' : 'not liked'} dream: ${dreamId}`);
      setHasLiked(liked);
      
      // Store the current like state after initial check
      if (isFirstRender.current) {
        previousLikeState.current = liked;
        isFirstRender.current = false;
      }
    } catch (error) {
      console.error('Exception checking like status:', error);
      setHasLiked(false);
    }
  }, [dreamId, user, isValidDreamId]);

  // Setup and manage Realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!isValidDreamId) return null;

    // Create a unique channel ID for each subscription to avoid conflicts
    const channelId = `likes-${dreamId}-${Math.random().toString(36).substr(2, 9)}`;
    
    debugLog(`Setting up real-time subscription for dream: ${dreamId}`);
    
    // This creates a channel but doesn't subscribe yet
    const channel = supabase.channel(channelId);
    
    // Add the postgres change listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `dream_id=eq.${dreamId}`
      },
      (payload) => {
        debugLog('Real-time like update received');
        // Force refetch to get the latest count
        refetch();
        
        // Check user's like status
        if (user) {
          checkLikeStatus();
        }
        
        // Call onSuccess if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    );
    
    // Subscribe and handle subscription status
    channel.subscribe((status) => {
      debugLog(`Realtime subscription status: ${status}`);
      
      // Handle connection status changes based on the actual enum values from Supabase
      if (status === 'CLOSED') {
        debugLog('Realtime channel disconnected');
        connectionManager.reconnect();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription error');
      }
    });

    return channel;
  }, [dreamId, isValidDreamId, user, checkLikeStatus, onSuccess, refetch]);

  // Setup real-time subscription for likes
  useEffect(() => {
    // Only setup if we have a valid dreamId and we're online
    if (!isValidDreamId) return;

    // Setup the channel
    const channel = setupRealtimeSubscription();
    if (channel) {
      channelRef.current = channel;
    }

    // Register a reconnect callback with connectionManager
    connectionManager.onReconnect(() => {
      debugLog('Connection restored, re-establishing Realtime subscription');
      // Clean up existing subscription if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Create a new subscription
      const newChannel = setupRealtimeSubscription();
      if (newChannel) {
        channelRef.current = newChannel;
      }
      
      // Refetch data
      refetch();
      checkLikeStatus();
    });

    return () => {
      // Always clean up subscription on unmount
      debugLog(`Cleaning up subscription for dream: ${dreamId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [dreamId, isValidDreamId, setupRealtimeSubscription, refetch, checkLikeStatus]);

  // Initial check
  useEffect(() => {
    if (isValidDreamId) {
      checkLikeStatus();
    }
  }, [checkLikeStatus, isValidDreamId]);
  
  // Toggle like status mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to like dreams');
      if (!isValidDreamId) throw new Error('Invalid dream ID');
      
      // Check if we're online before proceeding
      if (!connectionManager.isOnline()) {
        throw new Error('You appear to be offline. Please check your connection and try again.');
      }
      
      // Critical: Ensure we're working with the latest state
      // Check the current like status from the database right before toggling
      const { data, error: checkError } = await supabase
        .from('likes')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      // Use the freshly retrieved state, not the potentially stale local state
      const currentlyLiked = !!data;
      debugLog(`Current like state from DB for dream ${dreamId}: ${currentlyLiked ? 'liked' : 'not liked'}`);
      
      try {
        if (currentlyLiked) {
          // Unlike
          debugLog(`Unliking dream: ${dreamId}`);
          const { error: unlikeError } = await supabase
            .from('likes')
            .delete()
            .match({
              dream_id: dreamId,
              user_id: user.id
            });
            
          if (unlikeError) {
            console.error('Error details:', unlikeError);
            
            if (unlikeError.code === 'PGRST301' || unlikeError.message.includes('permission')) {
              throw new Error('Permission denied: You cannot unlike this dream. Please check your account permissions.');
            }
            
            throw unlikeError;
          }
          
          // Important: Immediately update UI state to match DB state
          setHasLiked(false);
          return false; // Unliked
        } else {
          // Like
          debugLog(`Liking dream: ${dreamId}`);
          const { error: likeError } = await supabase
            .from('likes')
            .insert({
              dream_id: dreamId,
              user_id: user.id,
              created_at: new Date().toISOString()
            });
            
          if (likeError) {
            console.error('Error details:', likeError);
            
            if (likeError.code === 'PGRST301' || likeError.message.includes('permission')) {
              throw new Error('Permission denied: You cannot like this dream. Please check your account permissions.');
            }
            
            if (likeError.code === '23505') {
              // If this record already exists, don't treat it as an error
              debugLog('Like already exists, treating as success');
              // Important: Immediately update UI state to match DB state
              setHasLiked(true);
              return true; // Already liked
            }
            
            throw likeError;
          }
          
          // Important: Immediately update UI state to match DB state
          setHasLiked(true);
          return true; // Liked
        }
      } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['dream-likes-count', dreamId] });
      
      // Optimistically update the UI
      const newHasLiked = !hasLiked;
      previousLikeState.current = hasLiked;
      setHasLiked(newHasLiked);
      
      // Save previous values
      const previousCount = queryClient.getQueryData(['dream-likes-count', dreamId]) as number | undefined;
      debugLog(`Optimistic update: ${hasLiked ? 'unliking' : 'liking'} dream ${dreamId}`);
      
      // Optimistically update the count
      queryClient.setQueryData(['dream-likes-count', dreamId], (old: number = 0) => {
        const newCount = newHasLiked ? old + 1 : Math.max(0, old - 1);
        return newCount;
      });
      
      return { previousCount, previousHasLiked: hasLiked };
    },
    onError: (error, _, context) => {
      // Reset UI to previous state on error
      if (context) {
        setHasLiked(context.previousHasLiked);
        queryClient.setQueryData(['dream-likes-count', dreamId], context.previousCount);
      }
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating like status';
      
      // Check if it's a connection-related error
      if (
        !connectionManager.isOnline() || 
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('offline')
      ) {
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'You appear to be offline. Please check your connection and try again.',
        });
        
        // Try to reconnect
        connectionManager.reconnect();
      } else {
        // Show standard error
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description: errorMessage,
        });
      }
    },
    onSettled: () => {
      // Always refetch after a mutation to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: ['dream-likes-count', dreamId] });
    },
  });

  return {
    likesCount, 
    isLikesLoading,
    hasLiked, 
    toggleLike: () => toggleLikeMutation.mutate(),
    isToggling: toggleLikeMutation.isPending,
  };
}
