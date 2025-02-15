
export type DreamCategory = 'nightmare' | 'lucid' | 'recurring' | 'prophetic' | 'normal';
export type DreamEmotion = 'joy' | 'fear' | 'confusion' | 'anxiety' | 'peace' | 'excitement' | 'sadness' | 'neutral';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
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
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
