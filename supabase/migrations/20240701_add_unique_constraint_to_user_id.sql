-- Add unique constraint on user_id in customer_subscriptions table
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_subscriptions_user_id_key'
  ) THEN
    -- Add the unique constraint
    ALTER TABLE public.customer_subscriptions 
    ADD CONSTRAINT customer_subscriptions_user_id_key UNIQUE (user_id);
    
    RAISE NOTICE 'Added unique constraint on user_id column';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on user_id column';
  END IF;
END $$; 