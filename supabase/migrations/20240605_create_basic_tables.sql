-- Create the schema with extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the dreams table if it doesn't exist 
CREATE TABLE IF NOT EXISTS public.dreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  emotion TEXT,
  is_public BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the dream_analyses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dream_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  interpretation TEXT NOT NULL,
  rating INT DEFAULT 5,
  themes TEXT[] DEFAULT '{}',
  symbols TEXT[] DEFAULT '{}',
  emotions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create basic access policies
CREATE POLICY "Users can view their own dreams" 
ON public.dreams FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own dreams" 
ON public.dreams FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dreams" 
ON public.dreams FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dreams" 
ON public.dreams FOR DELETE 
USING (auth.uid() = user_id);

-- Dream analyses policies
CREATE POLICY "Users can view their own analyses" 
ON public.dream_analyses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses" 
ON public.dream_analyses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.dream_analyses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.dream_analyses FOR DELETE 
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.dreams TO authenticated;
GRANT ALL ON public.dream_analyses TO authenticated;
GRANT ALL ON public.profiles TO authenticated; 