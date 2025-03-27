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
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
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
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
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
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
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
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-dream-image', {
          body: { 
            dreamId: dream.id,
            description: `${dream.title} - ${dream.description}`
          },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      toast({
        title: "Image Generated",
        description: "Dream image has been generated successfully.",
      });
    },
    onError: (error) => {
      console.error('Image generation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate dream image. Please try again.",
      });
    },
    onSettled: (_, __, dream) => {
      // Remove the dream ID from the generating set regardless of success/failure
      setGeneratingImageForDreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(dream.id);
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
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
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
    editDream.mutate({ dreamId, updatedDream, file });
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
          onSubmit={(dreamId: string, updatedDream: Partial<Dream>, file?: File) => handleUpdateDream(dreamId, updatedDream, file)} 
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
