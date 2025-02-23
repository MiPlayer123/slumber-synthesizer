
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jduzfrjhxfxiyajvpkus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdXpmcmpoeGZ4aXlhanZwa3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTYyODMsImV4cCI6MjA1NTIzMjI4M30.gSYv1qXg4y3tTP3UjobDPjF9A1UldyOMjdYFVJlh47c";

// Create a storage wrapper with consistent key usage
const customStorage = {
  getItem: (key: string) => {
    const value = localStorage.getItem(key);
    console.log('Getting auth item:', key, value ? 'exists' : 'not found');
    return value;
  },
  setItem: (key: string, value: string) => {
    console.log('Setting auth item:', key);
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    console.log('Removing auth item:', key);
    localStorage.removeItem(key);
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('dreamjournal.auth.token');
  },
};

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: customStorage,
      storageKey: 'dreamjournal.auth.token',
    },
  }
);
