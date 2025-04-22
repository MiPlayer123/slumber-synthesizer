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
  END IF;
  
  -- Add canceled_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'canceled_at'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
  END IF;
  
  -- Add current_period_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;
END $$;

-- Update any active subscriptions that have cancel_at_period_end to status "canceling"
UPDATE public.customer_subscriptions
SET subscription_status = 'canceling'
WHERE subscription_status = 'active'
AND cancel_at_period_end = TRUE;

-- Add an index on the new columns for better performance
DO $$
BEGIN
  -- Create index on cancel_at_period_end if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_cancel'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_cancel ON public.customer_subscriptions(cancel_at_period_end);
  END IF;
  
  -- Create index on current_period_end if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_period_end'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_period_end ON public.customer_subscriptions(current_period_end);
  END IF;
END $$; 