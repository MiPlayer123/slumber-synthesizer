export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Add your Supabase types here
// For example:
export interface Database {
  public: {
    Tables: {
      dreams: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          content: string;
          title: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          content: string;
          title?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          content?: string;
          title?: string | null;
          image_url?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
