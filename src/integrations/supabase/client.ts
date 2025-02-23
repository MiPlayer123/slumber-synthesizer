
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jduzfrjhxfxiyajvpkus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
      storageKey: 'dreamjournal.auth.token',
    },
  }
);
