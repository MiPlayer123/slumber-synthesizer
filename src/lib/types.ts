export type DreamCategory =
  | "nightmare"
  | "lucid"
  | "recurring"
  | "prophetic"
  | "normal";
export type DreamEmotion =
  | "joy"
  | "fear"
  | "confusion"
  | "anxiety"
  | "peace"
  | "excitement"
  | "sadness"
  | "neutral";

export type DreamVisibility = "private" | "friends" | "public";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  website?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: DreamCategory;
  emotion: DreamEmotion;
  visibility: DreamVisibility;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  enhanced_description?: string | null;
  profiles?: Profile; // Added profiles property to hold user profile info when joined
}

export interface DreamAnalysis {
  id: string;
  dream_id: string;
  rating: number;
  themes: string[];
  symbols: string[];
  emotions: string[];
  interpretation: string;
  created_at: string;
  updated_at: string;
}
