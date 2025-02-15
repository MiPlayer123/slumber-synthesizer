import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles } from "lucide-react";
import type { Dream, DreamCategory, DreamEmotion } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const dreamCategories: DreamCategory[] = ['normal', 'nightmare', 'lucid', 'recurring', 'prophetic'];
const dreamEmotions: DreamEmotion[] = ['neutral', 'joy', 'fear', 'confusion', 'anxiety', 'peace', 'excitement', 'sadness'];

const Journal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newDream, setNewDream] = useState({
    title: "",
    description: "",
    category: "normal" as DreamCategory,
    emotion: "neutral" as DreamEmotion,
    is_public: false,
  });

  // Redirect if not authenticated
  if (!user) {
    console.log("No user found, redirecting to auth page");
    toast({
      variant: "destructive",
      title: "Authentication required",
      description: "Please log in to access your dream journal.",
    });
    return <Navigate to="/auth" replace />;
  }

  // Fetch dreams with detailed logging
  const { data: dreams, isLoading, error: fetchError } = useQuery({
    queryKey: ['dreams'],
    queryFn: async () => {
      console.log('Fetching dreams for user:', user.id);
      
      if (!user.id) {
        console.error('No user ID available for fetching dreams');
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dreams:', error);
        throw error;
      }

      console.log('Successfully fetched dreams:', data);
      return data as Dream[];
    },
  });

  // Create dream mutation with improved error handling
  const createDream = useMutation({
    mutationFn: async (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) {
        throw new Error('User must be logged in to create a dream');
      }

      console.log('Creating dream:', { ...dream, user_id: user.id });
      
      const { data, error } = await supabase
        .from('dreams')
        .insert([{ ...dream, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating dream:', error);
        throw error;
      }

      console.log('Dream created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      setIsCreating(false);
      setNewDream({
        title: "",
        description: "",
        category: "normal",
        emotion: "neutral",
        is_public: false,
      });
      toast({
        title: "Dream Created",
        description: "Your dream has been successfully recorded.",
      });
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

  // Show fetch error if any
  if (fetchError) {
    console.error('Error in dreams query:', fetchError);
    toast({
      variant: "destructive",
      title: "Error loading dreams",
      description: fetchError instanceof Error ? fetchError.message : "Failed to load dreams",
    });
  }

  const analyzeDream = async (dream: Dream) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-dream', {
        body: { dreamContent: `${dream.title}\n\n${dream.description}` },
      });

      if (error) throw error;
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing dream:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Failed to analyze dream. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with values:', newDream);
    createDream.mutate(newDream);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Dream Journal</h1>
        <Button
          onClick={() => setIsCreating(!isCreating)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Record Dream
        </Button>
      </div>

      {isCreating && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Record New Dream</CardTitle>
            <CardDescription>Document your dream experience</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Dream Title</Label>
                <Input
                  id="title"
                  value={newDream.title}
                  onChange={(e) => setNewDream({ ...newDream, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Dream Description</Label>
                <Textarea
                  id="description"
                  value={newDream.description}
                  onChange={(e) => setNewDream({ ...newDream, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newDream.category}
                    onValueChange={(value: DreamCategory) =>
                      setNewDream({ ...newDream, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {dreamCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emotion">Emotion</Label>
                  <Select
                    value={newDream.emotion}
                    onValueChange={(value: DreamEmotion) =>
                      setNewDream({ ...newDream, emotion: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {dreamEmotions.map((emotion) => (
                        <SelectItem key={emotion} value={emotion}>
                          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={newDream.is_public}
                  onCheckedChange={(checked) =>
                    setNewDream({ ...newDream, is_public: checked })
                  }
                />
                <Label htmlFor="is_public">Make this dream public</Label>
              </div>

              <Button type="submit" className="w-full">
                Save Dream
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading dreams...</p>
        ) : dreams?.length === 0 ? (
          <p className="text-center text-muted-foreground">No dreams recorded yet. Start by recording your first dream!</p>
        ) : (
          dreams?.map((dream) => (
            <Card key={dream.id} className="animate-fade-in">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{dream.title}</CardTitle>
                    <CardDescription>
                      {new Date(dream.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedDream(dream);
                        analyzeDream(dream);
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                        {dream.category}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                        {dream.emotion}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{dream.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={selectedDream !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedDream(null);
          setAnalysis(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedDream?.title} - Analysis</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground animate-pulse">Analyzing your dream...</p>
              </div>
            ) : analysis ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{analysis}</div>
              </div>
            ) : (
              <p className="text-muted-foreground">Failed to load analysis.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;
