-- Fix the dream_analyses table structure by ensuring user_id column exists
BEGIN;

-- First check if user_id column exists in dream_analyses table
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'dream_analyses' 
        AND column_name = 'user_id'
    ) INTO column_exists;

    -- If the column doesn't exist, add it
    IF NOT column_exists THEN
        -- Add user_id column to dream_analyses table
        ALTER TABLE public.dream_analyses 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Create an index on user_id for faster lookups
        CREATE INDEX idx_dream_analyses_user_id ON public.dream_analyses(user_id);

        -- Update existing records to set user_id from the related dream's user_id
        UPDATE public.dream_analyses a
        SET user_id = d.user_id
        FROM public.dreams d
        WHERE a.dream_id = d.id AND a.user_id IS NULL;
        
        -- Make user_id NOT NULL after the update
        ALTER TABLE public.dream_analyses 
        ALTER COLUMN user_id SET NOT NULL;

        RAISE NOTICE 'Added user_id column to dream_analyses table';
    ELSE
        RAISE NOTICE 'user_id column already exists in dream_analyses table';
    END IF;

    -- Ensure RLS policies use the user_id column
    -- First drop existing policies if they reference the wrong column
    DROP POLICY IF EXISTS "Users can view their own analyses" ON public.dream_analyses;
    DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.dream_analyses;
    DROP POLICY IF EXISTS "Users can update their own analyses" ON public.dream_analyses;
    DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.dream_analyses;
    
    -- Recreate policies with the correct user_id reference
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
    
    RAISE NOTICE 'Updated RLS policies for dream_analyses table';
END $$;

-- Fix the count_user_analyses_since RPC function to ensure it properly references user_id
CREATE OR REPLACE FUNCTION public.count_user_analyses_since(user_id_input UUID, since_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM dream_analyses
  WHERE 
    user_id = user_id_input AND
    created_at >= since_date;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_user_analyses_since TO authenticated;

COMMIT; 