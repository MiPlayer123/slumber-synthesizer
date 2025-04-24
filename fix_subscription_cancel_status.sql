-- Fix subscription cancellation status to match Stripe's standards
-- A subscription with cancel_at_period_end=true should be status='active' until the period ends
BEGIN;

-- First, check if we have the necessary columns
DO $$
BEGIN
  -- Check for cancel_at_period_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added cancel_at_period_end column';
  END IF;
  
  -- Check for current_period_end column
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

-- Fix subscriptions with status = 'canceled' but current_period_end has not yet passed
-- These should be active with cancel_at_period_end = true
WITH updated_subscriptions AS (
  UPDATE public.customer_subscriptions
  SET 
    subscription_status = 'active',
    cancel_at_period_end = TRUE,
    updated_at = NOW()
  WHERE 
    subscription_status = 'canceled'
    AND current_period_end > NOW()
    AND subscription_id IS NOT NULL
  RETURNING *
)
SELECT COUNT(*) AS fixed_subscriptions_count FROM updated_subscriptions;

-- Fix subscriptions with active status and cancel_at_period_end = false but were explicitly canceled
-- These should have cancel_at_period_end = true
WITH updated_canceled_subs AS (
  UPDATE public.customer_subscriptions
  SET 
    cancel_at_period_end = TRUE,
    updated_at = NOW()
  WHERE 
    canceled_at IS NOT NULL
    AND cancel_at_period_end = FALSE
    AND subscription_status IN ('active', 'canceled')
  RETURNING *
)
SELECT COUNT(*) AS fixed_canceled_subs_count FROM updated_canceled_subs;

-- Fix subscriptions where the status is directly 'canceled' in Stripe 
-- but we want to show as 'canceling' until the period ends
WITH updated_canceling_display AS (
  UPDATE public.customer_subscriptions
  SET 
    subscription_status = 'active',
    cancel_at_period_end = TRUE,
    updated_at = NOW()
  WHERE 
    subscription_status = 'canceled'
    AND current_period_end > NOW()
  RETURNING *
)
SELECT COUNT(*) AS fixed_canceling_display_count FROM updated_canceling_display;

COMMIT; 