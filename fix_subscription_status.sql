-- Fix subscription status for paid users
BEGIN;

-- Update all customer_subscriptions records that have a stripe_customer_id but are missing subscription_status
UPDATE public.customer_subscriptions
SET 
  subscription_status = 'active',
  updated_at = NOW()
WHERE 
  stripe_customer_id IS NOT NULL 
  AND (subscription_status IS NULL OR subscription_status != 'active');

-- Count how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT count(*) INTO updated_count
  FROM public.customer_subscriptions
  WHERE 
    stripe_customer_id IS NOT NULL 
    AND subscription_status = 'active'
    AND updated_at > NOW() - INTERVAL '5 minutes';
    
  RAISE NOTICE 'Updated % subscription records to active status', updated_count;
END $$;

-- Ensure we have the proper constraints/indexes for better performance
DO $$
BEGIN
  -- Create index on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_user_id'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_user_id ON public.customer_subscriptions(user_id);
    RAISE NOTICE 'Created index on customer_subscriptions.user_id';
  END IF;
  
  -- Create index on subscription_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customer_subscriptions' AND indexname = 'idx_customer_subscriptions_status'
  ) THEN
    CREATE INDEX idx_customer_subscriptions_status ON public.customer_subscriptions(subscription_status);
    RAISE NOTICE 'Created index on customer_subscriptions.subscription_status';
  END IF;
END $$;

-- Update RLS policies to ensure they work correctly
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.customer_subscriptions;
  
  -- Create policy for viewing subscriptions
  CREATE POLICY "Users can view their own subscriptions"
  ON public.customer_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
  
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.customer_subscriptions;
  
  -- Create policy for updating subscriptions
  CREATE POLICY "Users can update their own subscriptions"
  ON public.customer_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);
  
  RAISE NOTICE 'Updated RLS policies for customer_subscriptions';
END $$;

-- Make sure RLS is enabled
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Make sure authenticated users have proper access
GRANT SELECT, UPDATE ON public.customer_subscriptions TO authenticated;

COMMIT; 