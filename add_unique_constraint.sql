-- First create the table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'customer_subscriptions'
  ) THEN
    CREATE TABLE public.customer_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      subscription_id TEXT,
      subscription_status TEXT DEFAULT 'inactive',
      customer_portal_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Now add a unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.customer_subscriptions 
    ADD CONSTRAINT customer_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Fix any existing data issues by removing duplicate entries
DO $$
DECLARE
    duplicate_user_id UUID;
    rec RECORD;
BEGIN
    -- Create a temporary table to store user_ids with duplicates
    CREATE TEMP TABLE temp_duplicates AS
    SELECT user_id, COUNT(*) as count
    FROM public.customer_subscriptions
    GROUP BY user_id
    HAVING COUNT(*) > 1;
    
    -- For each user_id with duplicates
    FOR rec IN SELECT user_id FROM temp_duplicates LOOP
        duplicate_user_id := rec.user_id;
        
        -- Keep the most recent record and delete others
        DELETE FROM public.customer_subscriptions
        WHERE user_id = duplicate_user_id
        AND id NOT IN (
            SELECT id 
            FROM public.customer_subscriptions
            WHERE user_id = duplicate_user_id
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
        );
    END LOOP;
    
    -- Drop the temporary table
    DROP TABLE temp_duplicates;
END$$;

-- Force update subscriptions with existing subscription_id to active
UPDATE public.customer_subscriptions
SET subscription_status = 'active'
WHERE subscription_id IS NOT NULL
AND subscription_status != 'active';

-- Use this command to see the current status of subscriptions
-- SELECT * FROM public.customer_subscriptions; 