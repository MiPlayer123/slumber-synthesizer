import { useState } from "react";
import type { Dream } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DreamCategory, DreamEmotion } from "@/lib/types";
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
import { useToast } from "@/hooks/use-toast";

type CreateDreamFormProps = {
  onSubmit: (
    dream: Omit<Dream, "id" | "user_id" | "created_at" | "updated_at">,
    file?: File,
  ) => void;
};

const dreamCategories: DreamCategory[] = [
  "normal",
  "nightmare",
  "lucid",
  "recurring",
  "prophetic",
];
const dreamEmotions: DreamEmotion[] = [
  "neutral",
  "joy",
  "fear",
  "confusion",
  "anxiety",
  "peace",
  "excitement",
  "sadness",
];

export function CreateDreamForm({ onSubmit }: CreateDreamFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDream, setNewDream] = useState({
    title: "", // User will now directly input the title
    description: "",
    category: "normal" as DreamCategory,
    emotion: "neutral" as DreamEmotion,
    is_public: true,
  });

  const [inputMethod, setInputMethod] = useState<"text" | "voice">("text");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't proceed if there's no description or title
    if (!newDream.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please tell us about your dream before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!newDream.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your dream.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit the dream with the user-provided title
      onSubmit(newDream, selectedFile || undefined);
    } catch (error) {
      console.error("Error during dream submission:", error);
      toast({
        title: "Submission Error",
        description: "There was a problem saving your dream. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTranscription = (text: string) => {
    // Append the transcribed text to the existing description
    setNewDream((prev) => ({
      ...prev,
      description: (prev.description ? prev.description + "\n\n" : "") + text,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  return (
    <Card className="mb-6 max-w-3xl mx-auto">
      <CardHeader className="px-4 sm:px-6 pt-4 pb-2 sm:pt-6 sm:pb-4">
        <CardTitle>Record New Dream</CardTitle>
        <CardDescription>Document your dream experience</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pt-2 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Dream Title</Label>
            <Input
              id="title"
              value={newDream.title}
              onChange={(e) =>
                setNewDream({ ...newDream, title: e.target.value })
              }
              required
              placeholder="Enter a title for your dream"
            />
          </div>

          <Tabs
            value={inputMethod}
            onValueChange={(value) => setInputMethod(value as "text" | "voice")}
          >
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
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
                  onChange={(e) =>
                    setNewDream({ ...newDream, description: e.target.value })
                  }
                  required
                  rows={8}
                  className="dream-textarea"
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
                  onChange={(e) =>
                    setNewDream({ ...newDream, description: e.target.value })
                  }
                  required
                  rows={8}
                  className="dream-textarea"
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

          <div className="space-y-2">
            <Label htmlFor="media">Upload Image (Optional)</Label>
            <Input
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <p className="text-sm text-muted-foreground">
              Upload your own image or video, or let AI generate an image based
              on your dream.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Dream"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
