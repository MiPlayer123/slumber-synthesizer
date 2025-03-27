import { useState } from "react";
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

const Journal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dreamToDelete, setDreamToDelete] = useState<string | null>(null);
  const [generatingImageForDreams, setGeneratingImageForDreams] = useState<Set<string>>(new Set());

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

  // Custom hooks for data fetching
  const { data: dreams, isLoading } = useDreams(user.id);
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
        const { data: updatedDream, error: updateError } = await supabase
          .from('dreams')
          .update({ image_url: publicUrl })
          .eq('id', dreamId)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating dream with image URL:', updateError);
          throw updateError;
        }
        
        console.log('Media uploaded successfully:', publicUrl);
        return updatedDream;
      } catch (error) {
        console.error('Full upload error details:', error);
        throw error;
      }
    },
    onSuccess: (updatedDream) => {
      // Optimistically update the dreams in cache
      queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
        if (!oldData) return oldData;
        
        // Replace the updated dream in the array
        return oldData.map(dream => 
          dream.id === updatedDream.id ? updatedDream : dream
        );
      });
      
      // Also invalidate the query to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      
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
      // Optimistically update the dreams in cache
      queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
        if (!oldData) return [newDream];
        
        // Add the new dream to the beginning of the array (newest first)
        return [newDream, ...oldData];
      });
      
      // Also invalidate the query to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      
      setIsCreating(false);
      toast({
        title: "Dream Created",
        description: "Your dream has been successfully recorded.",
      });
      
      // If file is provided, upload it; otherwise generate AI image
      if (file) {
        uploadMedia.mutate({ dreamId: newDream.id, file });
      } else {
        // Add a small delay before starting image generation
        // This helps ensure the dream is fully saved before generating the image
        setTimeout(() => {
          generateImage.mutate(newDream);
        }, 500);
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
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
      console.log('Updating dream - details:', { dreamId, updatedDream, fileProvided: !!file });
      
      if (!user) {
        throw new Error('User must be logged in to edit a dream');
      }

      // Ensure all fields are properly formatted
      const sanitizedUpdate = {
        title: updatedDream.title,
        description: updatedDream.description,
        category: updatedDream.category,
        emotion: updatedDream.emotion,
        is_public: updatedDream.is_public,
      };
      
      console.log('Data being sent to Supabase:', sanitizedUpdate);

      try {
        const { data, error } = await supabase
          .from('dreams')
          .update(sanitizedUpdate)
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
      } catch (error) {
        console.error('Full error details for update:', error);
        throw error;
      }
    },
    onSuccess: ({ dream: updatedDream, file }) => {
      // Optimistically update the dreams in cache to ensure immediate UI update
      queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
        if (!oldData) return oldData;
        
        // Replace the updated dream in the array
        return oldData.map(dream => 
          dream.id === updatedDream.id ? updatedDream : dream
        );
      });
      
      // Also invalidate the query to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      
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
      
      // Helper function to check for image periodically with retries
      const checkForImageCompletion = async (dreamId: string, retries = 3, delayMs = 5000): Promise<Dream | null> => {
        let attempt = 1;
        const maxAttempts = retries;
        
        console.log(`Starting image completion check sequence (${maxAttempts} attempts, ${delayMs}ms intervals)`);
        
        while (attempt <= maxAttempts) {
          console.log(`Checking for image completion (attempt ${attempt}/${maxAttempts})...`);
          
          try {
            // Wait before checking to give the server time to process
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            const { data, error } = await supabase
              .from('dreams')
              .select('*')
              .eq('id', dreamId)
              .single();
              
            if (error) {
              console.error(`Error checking dream data (attempt ${attempt}):`, error);
              // Continue to next attempt instead of throwing
              attempt++;
              continue;
            }
            
            if (data.image_url) {
              console.log(`✅ Image found on attempt ${attempt}:`, data.image_url);
              return data;
            }
            
            console.log(`No image found on attempt ${attempt}, ${maxAttempts - attempt} attempts remaining`);
            attempt++;
          } catch (err) {
            console.error(`Exception during image check (attempt ${attempt}):`, err);
            attempt++;
          }
        }
        
        console.log(`❌ Image not found after ${maxAttempts} attempts`);
        return null;
      };
      
      try {
        // Invoke the Supabase function to generate the image
        const { error } = await supabase.functions.invoke('generate-dream-image', {
          body: { 
            dreamId: dream.id,
            description: `${dream.title} - ${dream.description}`
          }
        });

        if (error) {
          console.warn('Error from image generation function, but will check if image was generated anyway:', error);
        }
        
        // Wait a moment to allow the image generation to complete on the server
        // even if the client response times out
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Regardless of the function response, fetch the dream to check if the image was actually generated
        // This handles cases where the function completed but the response timed out
        const { data: updatedDream, error: fetchError } = await supabase
          .from('dreams')
          .select('*')
          .eq('id', dream.id)
          .single();
          
        if (fetchError) throw fetchError;
        
        // If we got an image URL, consider it successful even if there was an error from the function
        if (updatedDream.image_url) {
          console.log('Image found immediately after generation!', updatedDream.image_url);
          return updatedDream;
        }
        
        // If we didn't get an image immediately, start the retry process in background
        console.log('No image found immediately, starting background checks...');
        // This runs asynchronously in the background and won't block the function
        checkForImageCompletion(dream.id, 5, 5000).then(result => {
          if (result) {
            console.log('Background check found image later:', result.image_url);
            // Update the query cache with the new image
            queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.map(d => d.id === result.id ? result : d);
            });
            
            // Also invalidate to ensure everyone has the latest
            queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
          }
        }).catch(err => {
          console.error('Error in background image check:', err);
        });
        
        // If no image URL and there was an error from the function, throw it
        if (error) throw error;
        
        // Return the current dream state while checks continue in background
        return updatedDream;
      } catch (err) {
        console.error('Error in generate-dream-image process:', err);
        
        // Check if this is a network error or timeout when calling the function
        if (err.message?.includes('Failed to send a request to the Edge Function')) {
          console.log('Network error when calling Edge Function, will check for image later');
          
          // Wait longer and check if the image was generated anyway
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const { data: checkDream, error: checkError } = await supabase
              .from('dreams')
              .select('*')
              .eq('id', dream.id)
              .single();
              
            if (!checkError && checkDream.image_url) {
              console.log('Image was generated successfully despite network error');
              return checkDream;
            }
            
            // Start more comprehensive background retry process with longer intervals
            console.log('No image found after network error, starting extended background checks');
            checkForImageCompletion(dream.id, 8, 10000).then(result => {
              if (result) {
                console.log('Background check found image later:', result.image_url);
                // Update the query cache with the new image
                queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.map(d => d.id === result.id ? result : d);
                });
                
                // Also invalidate to ensure everyone has the latest
                queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
                
                // Clear from generating set
                setGeneratingImageForDreams(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(dream.id);
                  return newSet;
                });
                
                // Show success toast
                toast({
                  title: "Image Generated",
                  description: "Dream image has been generated successfully.",
                });
              }
            }).catch(err => {
              console.error('Error in extended background image check:', err);
              
              // Ensure dream is removed from generating state even if all retries fail
              setGeneratingImageForDreams(prev => {
                const newSet = new Set(prev);
                newSet.delete(dream.id);
                return newSet;
              });
            });
            
            // For network errors, we'll continue but return the current dream
            // This helps prevent the UI from showing an error when image might still be generated
            throw new Error('Network error during image generation - please wait for image to appear or refresh');
          } catch (checkErr) {
            console.error('Error checking for image after network error:', checkErr);
            throw checkErr;
          }
        }
        
        if (err.message?.includes('404') || err.status === 404) {
          throw new Error('The image generation endpoint was not found. Please ensure your Supabase function is deployed correctly.');
        }
        throw err;
      }
    },
    onSuccess: (updatedDream) => {
      // Optimistically update the dreams in cache
      queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
        if (!oldData) return oldData;
        
        // Replace the updated dream in the array
        return oldData.map(dream => 
          dream.id === updatedDream.id ? updatedDream : dream
        );
      });
      
      // Also invalidate the query to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      
      // Remove the dream ID from the generating set regardless of success
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedDream.id);
        return newSet;
      });
      
      // Only show success toast if we actually have an image URL
      if (updatedDream.image_url) {
        toast({
          title: "Image Generated",
          description: "Dream image has been generated successfully.",
        });
      } else {
        // Set up a sequence of retries to check for the image
        const retryIntervals = [3000, 6000, 10000, 15000];
        
        retryIntervals.forEach((delay, index) => {
          setTimeout(() => {
            console.log(`Scheduled refresh attempt ${index + 1}/${retryIntervals.length}`);
            // Refresh data to check if image has been generated
            queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
            
            // Check if the image exists now
            const currentDreams = queryClient.getQueryData(['dreams', user?.id]) as Dream[] | undefined;
            const currentDream = currentDreams?.find(d => d.id === updatedDream.id);
            
            if (currentDream?.image_url) {
              // If this is the first time we're seeing the image, show a toast
              if (!updatedDream.image_url) {
                toast({
                  title: "Image Generated",
                  description: "Dream image has been generated successfully.",
                });
              }
              
              // Remove from generating set if still there
              setGeneratingImageForDreams(prev => {
                const newSet = new Set(prev);
                newSet.delete(updatedDream.id);
                return newSet;
              });
            } else if (index === retryIntervals.length - 1) {
              // Last retry and still no image
              toast({
                title: "Image Generation Status",
                description: "Your image is still being processed. It may appear after refreshing the page.",
              });
              
              // Remove from generating set on last retry even if failed
              setGeneratingImageForDreams(prev => {
                const newSet = new Set(prev);
                newSet.delete(updatedDream.id);
                return newSet;
              });
            }
          }, delay);
        });
      }
    },
    onError: (error, dream) => {
      console.error('Image generation error:', error);
      
      // Remove the dream ID from the generating set on error
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(dream.id);
        return newSet;
      });
      
      // Custom message for network errors
      const isNetworkError = error.message?.includes('Failed to send a request to the Edge Function');
      
      toast({
        variant: "destructive",
        title: isNetworkError ? "Connection Issue" : "Error",
        description: isNetworkError 
          ? "Network issue while connecting to image generator. Your image may still be generated and appear after refreshing."
          : "Failed to generate dream image. The image may still appear after refreshing the page.",
      });
      
      // Even on error, invalidate the query after a delay to check if the image appeared
      // Use a longer delay for network errors
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      }, isNetworkError ? 10000 : 5000);
    },
    onSettled: (updatedDream, error, dream) => {
      // This ensures the dream is removed from the generating set in all cases
      if (dream) {
        setGeneratingImageForDreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(dream.id);
          return newSet;
        });
      }
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
        
        const { data, error } = await supabase.functions.invoke('analyze-dream', {
          body: { 
            dreamId: dream.id,
            dreamContent: `Title: ${dream.title}\n\nDescription: ${dream.description}\n\nCategory: ${dream.category}\n\nEmotion: ${dream.emotion}`
          },
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

      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting dream:', error);
        throw error;
      }

      return dreamId;
    },
    onSuccess: (dreamId) => {
      // Optimistically update the dreams in cache
      queryClient.setQueryData(['dreams', user?.id], (oldData: Dream[] | undefined) => {
        if (!oldData) return oldData;
        
        // Remove the deleted dream from the array
        return oldData.filter(dream => dream.id !== dreamId);
      });
      
      // Also invalidate the query to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['dreams', user?.id] });
      
      toast({
        title: "Dream Deleted",
        description: "Your dream has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete dream",
      });
    },
  });

  const handleAnalyzeDream = (dreamId: string) => {
    analyzeDream.mutate(dreamId);
  };

  const handleEditDream = (dreamId: string) => {
    setEditingDreamId(dreamId);
  };

  const handleUpdateDream = (dreamId: string, updatedDream: Partial<Dream>, file?: File) => {
    console.log('handleUpdateDream called with:', { dreamId, updatedDream, hasFile: !!file });
    
    if (!dreamId) {
      console.error('Missing dreamId in handleUpdateDream');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing dream ID. Please try again.",
      });
      return;
    }
    
    editDream.mutate({ 
      dreamId, 
      updatedDream, 
      file 
    });
  };

  const handleCancelEdit = () => {
    setEditingDreamId(null);
  };

  const handleDeleteDream = (dreamId: string) => {
    setDreamToDelete(dreamId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (dreamToDelete) {
      deleteDream.mutate(dreamToDelete);
    }
    setDeleteDialogOpen(false);
    setDreamToDelete(null);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <DreamHeader onCreateClick={() => setIsCreating(!isCreating)} />

      {isCreating && <CreateDreamForm onSubmit={(dream, file) => createDream.mutate({ dream, file })} />}

      {editingDreamId && dreamBeingEdited && (
        <EditDreamForm 
          dream={dreamBeingEdited} 
          onSubmit={(dreamId, updatedDream, file) => {
            console.log('EditDreamForm onSubmit called with:', { dreamId, updatedDream, hasFile: !!file });
            handleUpdateDream(dreamId, updatedDream, file);
          }} 
          onCancel={handleCancelEdit} 
        />
      )}

      <DreamsList 
        dreams={dreams || []} 
        analyses={analyses} 
        onAnalyze={handleAnalyzeDream}
        onEdit={handleEditDream}
        onDelete={handleDeleteDream}
        isLoading={isLoading}
        generatingImageForDreams={generatingImageForDreams}
      />

      <AnalyzingDialog 
        isOpen={isAnalyzing}
        onOpenChange={(open) => {
          if (!open) {
            setIsAnalyzing(false);
          }
        }}
      />

      {deleteDialogOpen && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Dream"
          description="Are you sure you want to delete this dream? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      
      {/* Feedback Banner */}
      <FeedbackBanner feedbackUrl="https://forms.gle/aMFrfqbqiMMBSEKr9" />
    </div>
  );
};

export default Journal;
