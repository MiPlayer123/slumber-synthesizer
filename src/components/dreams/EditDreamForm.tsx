import { useState } from "react";
import type { Dream } from "@/lib/types";
import { DreamCategory, DreamEmotion } from "@/lib/types";
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
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

type EditDreamFormProps = {
  dream: Dream;
  onSubmit: (dreamId: string, updatedDream: Partial<Dream>, file?: File) => void;
  onCancel: () => void;
};

const dreamCategories: DreamCategory[] = ['normal', 'nightmare', 'lucid', 'recurring', 'prophetic'];
const dreamEmotions: DreamEmotion[] = ['neutral', 'joy', 'fear', 'confusion', 'anxiety', 'peace', 'excitement', 'sadness'];

export function EditDreamForm({ dream, onSubmit, onCancel }: EditDreamFormProps) {
  const [formData, setFormData] = useState({
    title: dream.title,
    description: dream.description,
    category: dream.category,
    emotion: dream.emotion,
    is_public: dream.is_public,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(dream.id, formData, selectedFile || undefined);
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
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4" 
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle>Edit Dream</CardTitle>
        <CardDescription>Update your dream record</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Dream Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Dream Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: DreamCategory) =>
                  setFormData({ ...formData, category: value })
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
                value={formData.emotion}
                onValueChange={(value: DreamEmotion) =>
                  setFormData({ ...formData, emotion: value })
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
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_public: checked })
              }
            />
            <Label htmlFor="is_public">Make this dream public</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Upload New Image or Video (Optional)</Label>
            <Input 
              id="media" 
              type="file" 
              accept="image/*,video/*" 
              onChange={handleFileChange} 
            />
            <p className="text-sm text-muted-foreground">
              Upload a new image or video to replace the current one.
            </p>
            {selectedFile && (
              <div className="mt-2">
                <p>Selected file: {selectedFile.name}</p>
              </div>
            )}
            {dream.image_url && !selectedFile && (
              <div className="mt-2">
                <p>Current media will be kept if no new file is selected.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
