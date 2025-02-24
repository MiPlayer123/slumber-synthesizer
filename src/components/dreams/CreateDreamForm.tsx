
import { useState } from "react";
import { Dream, DreamCategory, DreamEmotion } from "@/lib/types";
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

interface CreateDreamFormProps {
  onSubmit: (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

const dreamCategories: DreamCategory[] = ['normal', 'nightmare', 'lucid', 'recurring', 'prophetic'];
const dreamEmotions: DreamEmotion[] = ['neutral', 'joy', 'fear', 'confusion', 'anxiety', 'peace', 'excitement', 'sadness'];

export const CreateDreamForm = ({ onSubmit }: CreateDreamFormProps) => {
  const [newDream, setNewDream] = useState({
    title: "",
    description: "",
    category: "normal" as DreamCategory,
    emotion: "neutral" as DreamEmotion,
    is_public: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      await onSubmit(newDream);
      
      // Reset form after successful submission
      setNewDream({
        title: "",
        description: "",
        category: "normal",
        emotion: "neutral",
        is_public: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-8 max-w-3xl mx-auto">
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
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Dream Description</Label>
            <Textarea
              id="description"
              value={newDream.description}
              onChange={(e) => setNewDream({ ...newDream, description: e.target.value })}
              required
              className="w-full min-h-[120px]"
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
                <SelectTrigger className="w-full">
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
                <SelectTrigger className="w-full">
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

          <Button 
            type="submit" 
            className="w-full touch-manipulation"
            disabled={isSubmitting}
            aria-label="Save Dream"
          >
            {isSubmitting ? "Saving..." : "Save Dream"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
