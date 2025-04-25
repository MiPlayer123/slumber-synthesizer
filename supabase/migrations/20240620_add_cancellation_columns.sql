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

  -- Update subscription status to include "canceling" for active subscriptions that have cancel_at_period_end
  UPDATE public.customer_subscriptions
  SET subscription_status = 'canceling'
  WHERE subscription_status = 'active'
  AND cancel_at_period_end = TRUE;
END $$;

-- Add an index on cancel_at_period_end for better performance
CREATE INDEX IF NOT EXISTS idx_cust_subs_cancel_at_period_end 
ON public.customer_subscriptions(cancel_at_period_end); 