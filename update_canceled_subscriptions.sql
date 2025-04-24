-- Fix canceled subscriptions to properly show as "canceling" if still in paid period
BEGIN;

-- Log the count of subscriptions before fixing
DO $$
DECLARE
  active_count INTEGER;
  canceled_count INTEGER;
  canceling_count INTEGER;
BEGIN
  -- Count active subscriptions
  SELECT COUNT(*) INTO active_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'active';
  
  -- Count canceled subscriptions
  SELECT COUNT(*) INTO canceled_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'canceled';
  
  -- Count canceling subscriptions (active with cancel_at_period_end = true)
  SELECT COUNT(*) INTO canceling_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'active'
  AND cancel_at_period_end = TRUE;
  
  RAISE NOTICE 'Before fixing: % active (% with cancel_at_period_end=true), % canceled', 
    active_count, canceling_count, canceled_count;
END$$;

-- Update subscriptions that are marked as "canceled" but current_period_end is in the future
-- These should have status="active" and cancel_at_period_end=true
WITH updated_subs AS (
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
SELECT COUNT(*) AS fixed_count FROM updated_subs;

-- Update subscriptions with canceled_at set but cancel_at_period_end=false
-- These should have cancel_at_period_end=true
WITH updated_flags AS (
  UPDATE public.customer_subscriptions
  SET 
    cancel_at_period_end = TRUE,
    updated_at = NOW()
  WHERE 
    canceled_at IS NOT NULL
    AND cancel_at_period_end = FALSE
  RETURNING *
)
SELECT COUNT(*) AS fixed_flag_count FROM updated_flags;

-- Log the count of subscriptions after fixing
DO $$
DECLARE
  active_count INTEGER;
  canceled_count INTEGER;
  canceling_count INTEGER;
BEGIN
  -- Count active subscriptions
  SELECT COUNT(*) INTO active_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'active';
  
  -- Count canceled subscriptions
  SELECT COUNT(*) INTO canceled_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'canceled';
  
  -- Count canceling subscriptions (active with cancel_at_period_end = true)
  SELECT COUNT(*) INTO canceling_count
  FROM public.customer_subscriptions
  WHERE subscription_status = 'active'
  AND cancel_at_period_end = TRUE;
  
  RAISE NOTICE 'After fixing: % active (% with cancel_at_period_end=true), % canceled', 
    active_count, canceling_count, canceled_count;
END$$;

COMMIT; 