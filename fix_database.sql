-- Fix the dream_analyses table completely by recreating it if needed
BEGIN;

-- First make sure that all RLS policies are dropped (to prevent conflicts)
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.dream_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.dream_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.dream_analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.dream_analyses;

-- Check if the table needs to be recreated
DO $$
BEGIN
  -- If there are issues with the table structure, recreate it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'dream_analyses'
  ) THEN
    -- Rather than trying to alter existing structure, drop and recreate for clean slate
    DROP TABLE IF EXISTS public.dream_analyses;
  END IF;
END $$;

-- Create the dream_analyses table properly
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

-- Enable RLS
ALTER TABLE public.dream_analyses ENABLE ROW LEVEL SECURITY;

-- Add necessary policies
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
GRANT ALL ON public.dream_analyses TO authenticated;

-- Now fix the customer_subscriptions table
-- Make sure the subscription_status is set properly for existing users

-- Check if we need to add the field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
  END IF;
  
  -- Make sure we have a subscription_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_id TEXT;
  END IF;
  
  -- Make sure we have a customer_portal_url field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'customer_portal_url'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN customer_portal_url TEXT;
  END IF;
END $$;

-- Update subscription status based on subscription ID existence
UPDATE public.customer_subscriptions
SET subscription_status = 'active'
WHERE subscription_id IS NOT NULL 
AND (subscription_status IS NULL OR subscription_status = 'inactive');

COMMIT; 