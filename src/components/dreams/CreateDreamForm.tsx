import { useState } from "react";
import { Dream, DreamCategory, DreamEmotion } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
import { VoiceRecorder } from "@/components/audio/VoiceRecorder";
import { Mic, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { titleGenerationService } from "@/services/titleGenerationService";
import { useToast } from "@/hooks/use-toast";

interface CreateDreamFormProps {
  onSubmit: (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

const dreamCategories: DreamCategory[] = ['normal', 'nightmare', 'lucid', 'recurring', 'prophetic'];
const dreamEmotions: DreamEmotion[] = ['neutral', 'joy', 'fear', 'confusion', 'anxiety', 'peace', 'excitement', 'sadness'];

export const CreateDreamForm = ({ onSubmit }: CreateDreamFormProps) => {
  const { toast } = useToast();
  const [newDream, setNewDream] = useState({
    title: "", // Still keeping the title property, but it will be auto-generated
    description: "",
    category: "normal" as DreamCategory,
    emotion: "neutral" as DreamEmotion,
    is_public: false,
  });
  
  const [inputMethod, setInputMethod] = useState<"text" | "voice">("text");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't proceed if there's no description
    if (!newDream.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please tell us about your dream before saving.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate a title based on the description
      const generatedTitle = await titleGenerationService.generateTitle(newDream.description);
      
      // Create the dream object with the generated title
      const dreamToSubmit = {
        ...newDream,
        title: generatedTitle
      };
      
      // Submit the dream
      onSubmit(dreamToSubmit);
    } catch (error) {
      console.error('Error during dream submission:', error);
      toast({
        title: "Submission Error",
        description: "There was a problem saving your dream. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTranscription = (text: string) => {
    // Append the transcribed text to the existing description
    setNewDream(prev => ({
      ...prev,
      description: (prev.description ? prev.description + "\n\n" : "") + text
    }));
  };

  return (
    <Card className="mb-8 max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Record New Dream</CardTitle>
        <CardDescription>Document your dream experience</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "voice")}>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="description">What was your dream about?</Label>
                <TabsList>
                  <TabsTrigger value="text">Type</TabsTrigger>
                  <TabsTrigger value="voice">
                    <Mic className="h-4 w-4 mr-2" />
                    Voice
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="text" className="mt-0 pt-0">
                <Textarea
                  id="description"
                  value={newDream.description}
                  onChange={(e) => setNewDream({ ...newDream, description: e.target.value })}
                  required
                  rows={8}
                  placeholder="Describe your dream in as much detail as you can remember..."
                />
              </TabsContent>
              
              <TabsContent value="voice" className="mt-0 pt-0">
                <div className="mb-4">
                  <VoiceRecorder 
                    onTranscriptionComplete={handleTranscription}
                  />
                </div>
                
                <Textarea
                  id="description-voice"
                  value={newDream.description}
                  onChange={(e) => setNewDream({ ...newDream, description: e.target.value })}
                  required
                  rows={8}
                  placeholder="Your transcribed dream will appear here... Describe your dream in as much detail as you can remember."
                />
              </TabsContent>
            </div>
          </Tabs>

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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Title...
              </>
            ) : (
              'Save Dream'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
