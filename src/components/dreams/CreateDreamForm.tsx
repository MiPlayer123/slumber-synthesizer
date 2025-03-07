import { useState } from "react";
import type { Dream } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DreamCategory, DreamEmotion } from "@/lib/types";
import { Label } from "@/components/ui/label";
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

type CreateDreamFormProps = {
  onSubmit: (dream: Omit<Dream, 'id' | 'user_id' | 'created_at' | 'updated_at'>, file?: File) => void;
};

const dreamCategories: DreamCategory[] = ['normal', 'nightmare', 'lucid', 'recurring', 'prophetic'];
const dreamEmotions: DreamEmotion[] = ['neutral', 'joy', 'fear', 'confusion', 'anxiety', 'peace', 'excitement', 'sadness'];

export function CreateDreamForm({ onSubmit }: CreateDreamFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDream, setNewDream] = useState({
    title: "",
    description: "",
    category: "normal" as DreamCategory,
    emotion: "neutral" as DreamEmotion,
    is_public: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(newDream, selectedFile || undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
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

          <div className="space-y-2">
            <Label htmlFor="media">Upload Image (Optional)</Label>
            <Input 
              id="media" 
              type="file" 
              accept="image/*,video/*" 
              onChange={handleFileChange} 
            />
            <p className="text-sm text-muted-foreground">
              Upload your own image or video, or let AI generate an image based on your dream.
            </p>
          </div>

          <Button type="submit" className="w-full">
            Save Dream
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
