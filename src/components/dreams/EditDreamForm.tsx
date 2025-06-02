import { useState } from "react";
import type { Dream } from "@/lib/types";
import { DreamCategory, DreamEmotion, DreamVisibility } from "@/lib/types";
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

import { Loader2, Lock, Users, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EditDreamFormProps = {
  dream: Dream;
  onSubmit: (
    dreamId: string,
    updatedDream: Partial<Dream>,
    file?: File,
  ) => void;
  onCancel: () => void;
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

const visibilityOptions: {
  value: DreamVisibility;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    value: "private",
    label: "Private",
    icon: Lock,
    description: "Only you can see this dream",
  },
  {
    value: "friends",
    label: "Friends Only",
    icon: Users,
    description: "Only your friends can see this dream",
  },
  {
    value: "public",
    label: "Public",
    icon: Globe,
    description: "Everyone can see this dream",
  },
];

export function EditDreamForm({
  dream,
  onSubmit,
  onCancel,
}: EditDreamFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updatedDream, setUpdatedDream] = useState({
    title: dream.title,
    description: dream.description,
    category: dream.category,
    emotion: dream.emotion,
    visibility: dream.visibility,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't proceed if there's no description or title
    if (!updatedDream.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please tell us about your dream before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!updatedDream.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your dream.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit(dream.id, updatedDream, selectedFile || undefined);
    } catch (error) {
      console.error("Error during dream update:", error);
      toast({
        title: "Update Error",
        description:
          "There was a problem updating your dream. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
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
        <CardTitle>Edit Dream</CardTitle>
        <CardDescription>Update your dream details</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pt-2 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Dream Title</Label>
            <Input
              id="title"
              value={updatedDream.title}
              onChange={(e) =>
                setUpdatedDream({ ...updatedDream, title: e.target.value })
              }
              required
              placeholder="Enter a title for your dream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What was your dream about?</Label>
            <Textarea
              id="description"
              value={updatedDream.description}
              onChange={(e) =>
                setUpdatedDream({
                  ...updatedDream,
                  description: e.target.value,
                })
              }
              required
              rows={8}
              placeholder="Describe your dream in as much detail as you can remember..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={updatedDream.category}
                onValueChange={(value: DreamCategory) =>
                  setUpdatedDream({ ...updatedDream, category: value })
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
                value={updatedDream.emotion}
                onValueChange={(value: DreamEmotion) =>
                  setUpdatedDream({ ...updatedDream, emotion: value })
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

          <div className="space-y-2">
            <Label htmlFor="visibility">Who can see this dream?</Label>
            <Select
              value={updatedDream.visibility}
              onValueChange={(value: DreamVisibility) =>
                setUpdatedDream({ ...updatedDream, visibility: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Replace Image (Optional)</Label>
            <Input
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <p className="text-sm text-muted-foreground">
              Upload a new image or keep the existing one.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto order-1 sm:order-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Dream"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
