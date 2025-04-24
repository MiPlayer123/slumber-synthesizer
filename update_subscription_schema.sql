-- Update the subscription table schema to match Stripe's data model
-- This replaces subscription_status with status and ensures it gets values directly from Stripe
BEGIN;

-- First, check if we have the necessary columns
DO $$
BEGIN
  -- Check for the existing subscription_status column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'subscription_status'
  ) THEN
    -- Add the new status column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customer_subscriptions' 
      AND column_name = 'status'
    ) THEN
      -- Add the new status column
      ALTER TABLE public.customer_subscriptions ADD COLUMN status TEXT;
      RAISE NOTICE 'Added new status column';
      
      -- Copy values from subscription_status to status
      UPDATE public.customer_subscriptions
      SET status = subscription_status;
      RAISE NOTICE 'Copied values from subscription_status to status';
      
      -- Drop the old subscription_status column
      ALTER TABLE public.customer_subscriptions DROP COLUMN subscription_status;
      RAISE NOTICE 'Dropped old subscription_status column';
    ELSE
      RAISE NOTICE 'The status column already exists';
    END IF;
  ELSE
    -- If subscription_status doesn't exist but status doesn't either, add status
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customer_subscriptions' 
      AND column_name = 'status'
    ) THEN
      ALTER TABLE public.customer_subscriptions ADD COLUMN status TEXT;
      RAISE NOTICE 'Added status column (subscription_status did not exist)';
    ELSE
      RAISE NOTICE 'The status column already exists and subscription_status does not exist';
    END IF;
  END IF;
  
  -- Make sure the cancel_at_period_end column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added cancel_at_period_end column';
  END IF;
  
  -- Make sure the current_period_end column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
    RAISE NOTICE 'Added current_period_end column';
  END IF;
END$$;

-- Add index on status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_status'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_status ON public.customer_subscriptions(status);
    RAISE NOTICE 'Created index on status';
  END IF;
END$$;

-- Count subscriptions by status and cancel_at_period_end
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Subscription distribution after update:';
  
  FOR rec IN 
    SELECT 
      status, 
      cancel_at_period_end, 
      COUNT(*) AS count
    FROM 
      public.customer_subscriptions
    GROUP BY 
      status, cancel_at_period_end
    ORDER BY 
      status, cancel_at_period_end
  LOOP
    RAISE NOTICE '  Status: %, Cancel at Period End: %, Count: %', 
      COALESCE(rec.status, 'NULL'), 
      COALESCE(rec.cancel_at_period_end::text, 'NULL'), 
      rec.count;
  END LOOP;
END$$;

COMMIT; 