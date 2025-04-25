-- Add additional columns to store cancellation details
DO $$
BEGIN
  -- Add cancel_at_period_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added cancel_at_period_end column';
  ELSE
    RAISE NOTICE 'cancel_at_period_end column already exists';
  END IF;
  
  -- Add canceled_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'canceled_at'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
    RAISE NOTICE 'Added canceled_at column';
  ELSE
    RAISE NOTICE 'canceled_at column already exists';
  END IF;
  
  -- Add current_period_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
    RAISE NOTICE 'Added current_period_end column';
  ELSE
    RAISE NOTICE 'current_period_end column already exists';
  END IF;
END $$;

-- Update any active subscriptions that have cancellation flag to status "canceling"
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Check if we can use the cancel_at_period_end column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) THEN
    -- Update status for subscriptions marked as canceling
    WITH updated AS (
      UPDATE public.customer_subscriptions
      SET subscription_status = 'canceling'
      WHERE subscription_status = 'active'
      AND cancel_at_period_end = TRUE
      RETURNING *
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    RAISE NOTICE 'Updated % subscriptions to canceling status', updated_count;
  ELSE
    RAISE NOTICE 'cancel_at_period_end column does not exist yet, skipping status update';
  END IF;
END $$;

-- Add indexes on the new columns for better performance
DO $$
BEGIN
  -- Create index on cancel_at_period_end if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_cancel'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_cancel ON public.customer_subscriptions(cancel_at_period_end);
    RAISE NOTICE 'Created index on cancel_at_period_end';
  END IF;
  
  -- Create index on current_period_end if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'current_period_end'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_period_end'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_period_end ON public.customer_subscriptions(current_period_end);
    RAISE NOTICE 'Created index on current_period_end';
  END IF;
END $$; 