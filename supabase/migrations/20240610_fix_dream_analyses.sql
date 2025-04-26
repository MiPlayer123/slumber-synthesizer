-- This migration adds the new columns to the dream_analyses table
-- if they don't exist already

-- First, check if the columns need to be added
DO $$
BEGIN
    -- Add interpretation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'dream_analyses' 
                    AND column_name = 'interpretation') THEN
        ALTER TABLE public.dream_analyses ADD COLUMN interpretation TEXT;
    END IF;

    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'dream_analyses' 
                    AND column_name = 'rating') THEN
        ALTER TABLE public.dream_analyses ADD COLUMN rating INT DEFAULT 5;
    END IF;

    -- Add themes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'dream_analyses' 
                    AND column_name = 'themes') THEN
        ALTER TABLE public.dream_analyses ADD COLUMN themes TEXT[] DEFAULT '{}';
    END IF;

    -- Add symbols column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'dream_analyses' 
                    AND column_name = 'symbols') THEN
        ALTER TABLE public.dream_analyses ADD COLUMN symbols TEXT[] DEFAULT '{}';
    END IF;

    -- Add emotions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'dream_analyses' 
                    AND column_name = 'emotions') THEN
        ALTER TABLE public.dream_analyses ADD COLUMN emotions TEXT[] DEFAULT '{}';
    END IF;

    -- If we have an old 'analysis' column, migrate data to 'interpretation'
    IF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'dream_analyses' 
                AND column_name = 'analysis') THEN
        -- Copy data from analysis to interpretation if interpretation is null
        UPDATE public.dream_analyses 
        SET interpretation = analysis 
        WHERE interpretation IS NULL AND analysis IS NOT NULL;
        
        -- Now drop the old column
        ALTER TABLE public.dream_analyses DROP COLUMN analysis;
    END IF;
END $$;

-- Check for and create RLS policies if they don't exist
DO $$
BEGIN
    -- Add 'Users can view their own analyses' policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                    WHERE tablename = 'dream_analyses' 
                    AND policyname = 'Users can view their own analyses') THEN
        CREATE POLICY "Users can view their own analyses" 
        ON public.dream_analyses FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Add 'Users can insert their own analyses' policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                    WHERE tablename = 'dream_analyses' 
                    AND policyname = 'Users can insert their own analyses') THEN
        CREATE POLICY "Users can insert their own analyses" 
        ON public.dream_analyses FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Add 'Users can update their own analyses' policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                    WHERE tablename = 'dream_analyses' 
                    AND policyname = 'Users can update their own analyses') THEN
        CREATE POLICY "Users can update their own analyses" 
        ON public.dream_analyses FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    -- Add 'Users can delete their own analyses' policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                    WHERE tablename = 'dream_analyses' 
                    AND policyname = 'Users can delete their own analyses') THEN
        CREATE POLICY "Users can delete their own analyses" 
        ON public.dream_analyses FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$; 