-- Add subscription_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT;
    RAISE NOTICE 'Added subscription_status column';
    
    -- Copy values from status to subscription_status if status exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customer_subscriptions' 
      AND column_name = 'status'
    ) THEN
      UPDATE public.customer_subscriptions
      SET subscription_status = status;
      RAISE NOTICE 'Copied values from status to subscription_status';
    END IF;
    
  ELSE
    RAISE NOTICE 'subscription_status column already exists';
  END IF;
END $$;

-- Create index on subscription_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_subscription_status'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_subscription_status ON public.customer_subscriptions(subscription_status);
    RAISE NOTICE 'Created index on subscription_status';
  ELSE
    RAISE NOTICE 'Index on subscription_status already exists';
  END IF;
END $$; 