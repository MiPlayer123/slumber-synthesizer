import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Dream } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { CreateDreamForm } from "@/components/dreams/CreateDreamForm";
import { DreamsList } from "@/components/dreams/DreamsList";
import { DreamHeader } from "@/components/dreams/DreamHeader";
import { AnalyzingDialog } from "@/components/dreams/AnalyzingDialog";
import { EditDreamForm } from "@/components/dreams/EditDreamForm";
import { useDreams } from "@/hooks/use-dreams";
import { useDreamAnalyses } from "@/hooks/use-dream-analyses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { usePaginatedDreams } from "@/hooks/use-dreams";
import { track } from '@vercel/analytics/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const Journal = () => {
  const { user, completeGoogleSignUp } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dreamToDelete, setDreamToDelete] = useState<string | null>(null);
  const [generatingImageForDreams, setGeneratingImageForDreams] = useState<Set<string>>(new Set());
  
  // Reference to the top of the page
  const topRef = useRef<HTMLDivElement>(null);

  // New state for username setup
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

  // Effect to scroll to top when editing a dream
  useEffect(() => {
    if (editingDreamId && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingDreamId]);

  // Handle auth redirection
  if (!user) {
    console.log("No user found, redirecting to auth page");
    toast({
      variant: "destructive",
      title: "Authentication required",
      description: "Please log in to access your dream journal.",
    });
    return <Navigate to="/auth" replace />;
  }

  // Use the paginated dreams hook for infinite scrolling
  const { 
    data: dreamsPages, 
    isLoading: isLoadingDreams, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = usePaginatedDreams(user.id, 10);

  // Extract all dreams from pages
  const dreams = dreamsPages ? dreamsPages.pages.flatMap(page => page.dreams) : [];

  // Custom hooks for data fetching
  const { data: analyses } = useDreamAnalyses();

  // Get the dream being edited
  const dreamBeingEdited = editingDreamId 
    ? dreams?.find(dream => dream.id === editingDreamId) 
    : null;

  // Upload media mutation
  const uploadMedia = useMutation({
    mutationFn: async ({ dreamId, file }: { dreamId: string; file: File }) => {
      if (!user) {
        throw new Error('User must be logged in to upload files');
      }

      console.log('Uploading media for dream:', dreamId);
      
      try {
        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${dreamId}-${Date.now()}.${fileExt}`;
        
        // Upload directly to the root of the dream-images bucket (no subfolders)
        const filePath = `${fileName}`;
        
        // Upload the file to Supabase storage using the correct bucket name
        const { data, error } = await supabase.storage
          .from('dream-images')
          .upload(filePath, file);
          
        if (error) {
          console.error('Error uploading file:', error);
          throw error;
        }
        
        // Get the public URL from the correct bucket
        const { data: { publicUrl } } = supabase.storage
          .from('dream-images')
          .getPublicUrl(filePath);
          
        // Update the dream with the image URL only
        const { error: updateError } = await supabase
          .from('dreams')
          .update({ image_url: publicUrl })
          .eq('id', dreamId);
          
        if (updateError) {
          console.error('Error updating dream with image URL:', updateError);
          throw updateError;
        }
        
        console.log('Media uploaded successfully:', publicUrl);
        return publicUrl;
      } catch (error) {
        console.error('Full upload error details:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      toast({
        title: "Media Uploaded",
        description: "Your image or video has been uploaded successfully.",
      });
    },
    onError: (error) => {
      console.error('Media upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload media",
      });
    },
  });

  // Create dream mutation
  const createDream = useMutation({
    mutationFn: async ({ 
      dream, 
      file 
    }: { 
      dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
      file?: File
    }) => {
      if (!user) {
        throw new Error('User must be logged in to create a dream');
      }

      // Prepare the dream data with appropriate fields
      const dreamData = {
        title: dream.title,
        description: dream.description,
        category: dream.category, 
        emotion: dream.emotion,
        is_public: dream.is_public,
        user_id: user.id
      };
      
      console.log('Creating dream with data:', dreamData);
      
      try {
        const { data, error } = await supabase
          .from('dreams')
          .insert([dreamData])
          .select()
          .single();

        if (error) {
          console.error('Error creating dream:', error);
          throw error;
        }

        console.log('Dream created successfully:', data);
        return { dream: data, file };
      } catch (error) {
        console.error('Full error details:', error);
        throw error;
      }
    },
    onSuccess: ({ dream: newDream, file }) => {
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      
      // Track successful dream creation
      track('dream_created', {
        dream_id: newDream.id,
        has_image: !!file,
        category: newDream.category,
        emotion: newDream.emotion,
        is_public: newDream.is_public
      });
      
      // Optionally force a refetch of the first page to ensure immediate visibility
      queryClient.refetchQueries({ 
        queryKey: ['paginatedDreams', user.id], 
        type: 'active'
      });
      
      setIsCreating(false);
      toast({
        title: "Dream Created",
        description: "Your dream has been successfully recorded.",
      });
      
      // If file is provided, upload it; otherwise generate AI image
      if (file) {
        uploadMedia.mutate({ dreamId: newDream.id, file });
      } else {
        generateImage.mutate(newDream);
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      track('dream_creation_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dream",
      });
    },
  });

  // Edit dream mutation
  const editDream = useMutation({
    mutationFn: async ({ 
      dreamId, 
      updatedDream,
      file
    }: { 
      dreamId: string, 
      updatedDream: Partial<Dream>,
      file?: File
    }) => {
      console.log('Updating dream:', dreamId, updatedDream);
      
      if (!user) {
        throw new Error('User must be logged in to edit a dream');
      }

      // If file is provided, update image status
      const dataToUpdate = file 
        ? { ...updatedDream, image_status: 'uploading' } 
        : updatedDream;

      const { data, error } = await supabase
        .from('dreams')
        .update(dataToUpdate)
        .eq('id', dreamId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating dream:', error);
        throw error;
      }

      console.log('Dream updated successfully:', data);
      return { dream: data, file };
    },
    onSuccess: ({ dream: updatedDream, file }) => {
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      
      // Track successful dream update
      track('dream_updated', {
        dream_id: updatedDream.id,
        has_image: !!file,
        updated_fields: Object.keys(updatedDream).join(',')
      });
      
      // Force a refetch of the active queries to ensure immediate visibility
      queryClient.refetchQueries({ 
        queryKey: ['paginatedDreams', user.id], 
        type: 'active'
      });
      
      setEditingDreamId(null);
      toast({
        title: "Dream Updated",
        description: "Your dream has been successfully updated.",
      });
      
      // If file is provided, upload it
      if (file) {
        uploadMedia.mutate({ dreamId: updatedDream.id, file });
      }
    },
    onError: (error) => {
      console.error('Update error:', error);
      track('dream_update_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update dream",
      });
    },
  });

  // Generate image mutation
  const generateImage = useMutation({
    mutationFn: async (dream: Dream) => {
      console.log('Generating image for dream:', dream.id);
      
      // Add the dream ID to the generating set
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        newSet.add(dream.id);
        return newSet;
      });
      
      try {
        // Get current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('generate-dream-image', {
          body: { 
            dreamId: dream.id,
            description: `${dream.title} - ${dream.description}`
          },
          // Add authentication headers to ensure the function can be called
          headers: sessionData?.session ? {
            Authorization: `Bearer ${sessionData.session.access_token}`
          } : undefined
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error invoking generate-dream-image function:', err);
        if (err.message?.includes('404') || err.status === 404) {
          throw new Error('The image generation endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
      }
    },
    onSuccess: (data, dream) => {
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      queryClient.refetchQueries({ queryKey: ['paginatedDreams', user?.id], type: 'active' });

      // Check the status returned from the function
      if (data?.status === 'blocked_content') {
        // Show a specific warning toast for blocked content
        toast({
          variant: "warning",
          title: "Image Generation Blocked",
          description: data.message || "The image could not be generated due to content guidelines. Please try rephrasing your dream description.",
          duration: 7000,
        });
        
        // Optionally update the dream state locally if enhanced_description changed
        queryClient.setQueryData(['paginatedDreams', user?.id], (oldData: any) => {
          if (oldData && oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                dreams: page.dreams.map((d: Dream) => 
                  d.id === dream.id ? { ...d, enhanced_description: data.enhancedDescription } : d
                ),
              })),
            };
          }
          return oldData;
        });

      } else if (data?.success === true && data?.imageUrl) {
        toast({
          title: "Image Generated",
          description: "Dream image has been generated successfully.",
        });
      } else {
        console.warn("Received unexpected success response structure:", data);
        toast({
          variant: "destructive",
          title: "Update Issue",
          description: "Received an unclear response after image generation attempt.",
        });
      }
    },
    onError: (error: any, dream: Dream) => {
      console.error('Image generation error:', error, 'for dream:', dream);
      
      // Handle specific case of FunctionsFetchError - likely the function still executed
      if (error?.name === 'FunctionsFetchError' || error?.message?.includes('Failed to send a request to the Edge Function')) {
        console.log('Detected FunctionsFetchError - checking if image was still generated...');
        
        // Show toast to inform user
        toast({
          title: "Checking image status",
          description: "The image is still generating. Please wait a moment...",
        });
        
        // Wait longer since the function might still be processing despite the network error
        setTimeout(() => {
          // Query the database to check if the image_url was updated
          supabase
            .from('dreams')
            .select('image_url, enhanced_description')
            .eq('id', dream.id)
            .single()
            .then(({ data: dreamData, error: fetchError }) => {
              if (fetchError) {
                console.error("Error checking dream status after mutation error:", fetchError);
                toast({
                  variant: "destructive",
                  title: "Image Generation Failed",
                  description: error instanceof Error ? error.message : "Failed to generate dream image.",
                });
              } else if (dreamData && dreamData.image_url) {
                console.log('Image exists despite reported error:', dreamData.image_url);
                toast({
                  title: "Image Generated",
                  description: "Dream image has been generated successfully.",
                });
              } else {
                setTimeout(() => {
                  supabase
                    .from('dreams')
                    .select('image_url')
                    .eq('id', dream.id)
                    .single()
                    .then(({ data: finalCheck }) => {
                      if (finalCheck && finalCheck.image_url) {
                        console.log('Image found after second check:', finalCheck.image_url);
                        toast({
                          title: "Image Generated",
                          description: "Dream image has been generated successfully.",
                        });
                        
                        queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
                        queryClient.refetchQueries({ 
                          queryKey: ['paginatedDreams', user?.id], 
                          type: 'active'
                        });
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Image Generation Failed",
                          description: "Failed to generate dream image. Your dream was saved successfully, but we couldn't create an image for it.",
                        });
                      }
                    });
                }, 5000);
              }
              
              queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
              queryClient.refetchQueries({ 
                queryKey: ['paginatedDreams', user?.id], 
                type: 'active'
              });
            });
        }, 6000);
      }
      // Check if the dream image actually exists despite other types of errors
      else if (dream && dream.id) {
        supabase
          .from('dreams')
          .select('image_url, enhanced_description')
          .eq('id', dream.id)
          .single()
          .then(({ data: dreamData, error: fetchError }) => {
            if (fetchError) {
              console.error("Error checking dream status after mutation error:", fetchError);
              toast({
                variant: "destructive",
                title: "Image Generation Failed",
                description: error instanceof Error ? error.message : "Failed to generate dream image.",
              });
            } else if (dreamData && dreamData.image_url) {
              console.log('Image exists despite reported error:', dreamData.image_url);
              toast({
                title: "Image Generated",
                description: "Dream image has been generated successfully.",
              });
            } else {
              toast({
                variant: "destructive",
                title: "Image Generation Failed",
                description: error instanceof Error ? error.message : "Failed to generate dream image.",
              });
            }
            
            queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
            queryClient.refetchQueries({ 
              queryKey: ['paginatedDreams', user?.id], 
              type: 'active'
            });
          });
      } else {
        toast({
          variant: "destructive",
          title: "Image Generation Failed",
          description: error instanceof Error ? error.message : "Failed to generate dream image.",
        });
      }
      
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        if (dream) {
          newSet.delete(dream.id);
        }
        return newSet;
      });
    },
    onSettled: (_, __, dream) => {
      if (dream && dream.id) {
        queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
        queryClient.refetchQueries({ 
          queryKey: ['paginatedDreams', user?.id], 
          type: 'active'
        });
      }
      
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        if (dream && dream.id) {
          newSet.delete(dream.id);
        }
        return newSet;
      });
    }
  });

  // Analyze dream mutation
  const analyzeDream = useMutation({
    mutationFn: async (dreamId: string) => {
      console.log('Analyzing dream:', dreamId);
      
      const dream = dreams?.find(d => d.id === dreamId);
      if (!dream) throw new Error('Dream not found');
      
      try {
        setIsAnalyzing(true);
        
        // Get current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('analyze-dream', {
          body: { 
            dreamId: dream.id,
            dreamContent: `Title: ${dream.title}\n\nDescription: ${dream.description}\n\nCategory: ${dream.category}\n\nEmotion: ${dream.emotion}`
          },
          // Add authentication headers to ensure the function can be called
          headers: sessionData?.session ? {
            Authorization: `Bearer ${sessionData.session.access_token}`
          } : undefined
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error invoking analyze-dream function:', err);
        if (err.message?.includes('404') || err.status === 404) {
          throw new Error('The dream analysis endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
      } finally {
        setIsAnalyzing(false);
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
  });

  // Delete dream mutation
  const deleteDream = useMutation({
    mutationFn: async (dreamId: string) => {
      console.log('Deleting dream:', dreamId);
      
      if (!user) {
        throw new Error('User must be logged in to delete a dream');
      }

      if (!dreamId) {
        throw new Error('Dream ID is required for deletion');
      }

      try {
        const { error } = await supabase
          .from('dreams')
          .delete()
          .eq('id', dreamId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting dream:', error);
          throw error;
        }

        console.log('Dream deleted successfully:', dreamId);
        return dreamId;
      } catch (error) {
        console.error('Full delete error details:', error);
        throw error;
      }
    },
    onSuccess: (dreamId) => {
      console.log('Dream delete success for ID:', dreamId);
      track('dream_deleted', { dream_id: dreamId });
      
      queryClient.invalidateQueries({ queryKey: ['paginatedDreams'] });
      
      // Force a refetch to update UI immediately
      queryClient.refetchQueries({ 
        queryKey: ['paginatedDreams', user.id], 
        type: 'active'
      });
      
      // Reset dream to delete
      setDreamToDelete(null);
      
      toast({
        title: "Dream Deleted",
        description: "Your dream has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      track('dream_delete_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        variant: "destructive",
        title: "Error Deleting Dream",
        description: error instanceof Error ? error.message : "Failed to delete dream. Please try again.",
      });
    },
  });

  const handleAnalyzeDream = (dreamId: string) => {
    track('dream_analysis_started', { dream_id: dreamId });
    analyzeDream.mutate(dreamId);
  };

  const handleEditDream = (dreamId: string) => {
    track('dream_edit_started', { dream_id: dreamId });
    setEditingDreamId(dreamId);
  };

  const handleUpdateDream = (dreamId: string, updatedDream: Partial<Dream>, file?: File) => {
    editDream.mutate({ dreamId, updatedDream, file });
  };

  const handleCancelEdit = () => {
    track('dream_edit_cancelled');
    setEditingDreamId(null);
  };

  const handleDeleteDream = (dreamId: string) => {
    track('dream_delete_initiated', { dream_id: dreamId });
    setDreamToDelete(dreamId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    try {
      if (!dreamToDelete) {
        console.error('No dream selected for deletion');
        toast({
          variant: "destructive",
          title: "Error",
          description: "No dream selected for deletion.",
        });
        return;
      }
      
      console.log('Confirming deletion of dream:', dreamToDelete);
      deleteDream.mutate(dreamToDelete);
    } catch (error) {
      console.error('Error in confirm delete:', error);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleCreateClick = () => {
    // Check if user has a username
    if (user?.app_metadata?.provider === 'google' && !user.user_metadata?.username) {
      setShowUsernameDialog(true);
      return;
    }
    setIsCreating(true);
  };

  const handleSubmitUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError("Username is required");
      return;
    }
    
    try {
      setIsSubmittingUsername(true);
      setUsernameError("");
      
      const { success, error } = await completeGoogleSignUp(newUsername);
      
      if (success) {
        toast({
          title: "Username Set",
          description: "Your username has been set successfully!",
        });
        setShowUsernameDialog(false);
        setIsCreating(true); // Now show the create dream form
      } else if (error) {
        setUsernameError(error.message || "Failed to set username");
      }
    } catch (error) {
      console.error("Error setting username:", error);
      setUsernameError("An unexpected error occurred");
    } finally {
      setIsSubmittingUsername(false);
    }
  };

  return (
    <div ref={topRef} className="container py-8 max-w-5xl">
      <DreamHeader 
        onCreateClick={() => setIsCreating(!isCreating)} 
        isCreating={isCreating}
      />
      
      <FeedbackBanner feedbackUrl="https://forms.gle/aMFrfqbqiMMBSEKr9" />

      {isCreating && (
        <CreateDreamForm
          onSubmit={(dream, file) => {
            console.log('Dream form submitted:', dream, file);
            // Ensure we're not submitting while already in progress
            if (createDream.isPending) return;
            createDream.mutate({ dream, file });
          }}
        />
      )}

      {editingDreamId && dreamBeingEdited && (
        <EditDreamForm
          dream={dreamBeingEdited}
          onSubmit={(dreamId, updatedDream, file) => {
            handleUpdateDream(dreamId, updatedDream, file);
          }}
          onCancel={handleCancelEdit}
        />
      )}

      <DreamsList
        dreams={dreams}
        analyses={analyses}
        onAnalyze={handleAnalyzeDream}
        onEdit={handleEditDream}
        onDelete={handleDeleteDream}
        isLoading={isLoadingDreams}
        generatingImageForDreams={generatingImageForDreams}
        // Add infinite scroll props
        infiniteScroll={true}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

      <AnalyzingDialog
        isOpen={isAnalyzing}
        onOpenChange={(open) => setIsAnalyzing(open)}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Dream"
        description="Are you sure you want to delete this dream? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDreamToDelete(null);
        }}
      />

      {/* Username Setup Dialog */}
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Your Username</DialogTitle>
            <DialogDescription>
              Please choose a username before creating your first dream.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="col-span-3"
                placeholder="Choose a username"
              />
            </div>
            {usernameError && (
              <p className="text-sm font-medium text-red-500">{usernameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitUsername} disabled={isSubmittingUsername}>
              {isSubmittingUsername ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Username...
                </>
              ) : (
                "Set Username"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;
