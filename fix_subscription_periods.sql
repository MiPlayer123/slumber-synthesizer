-- Fix subscription period end dates
-- This script fixes subscriptions with NULL current_period_end by setting reasonable values
BEGIN;

-- Log the count of subscriptions with NULL current_period_end
DO $$
DECLARE
  null_period_count INTEGER;
BEGIN
  -- Count subscriptions with NULL end date
  SELECT COUNT(*) INTO null_period_count
  FROM public.customer_subscriptions
  WHERE current_period_end IS NULL
  AND subscription_status IN ('active', 'canceled');
  
  RAISE NOTICE 'Found % subscriptions with NULL current_period_end', null_period_count;
END$$;

-- Update active subscriptions with NULL current_period_end
-- For active subscriptions, set current_period_end to 1 month from now
WITH updated_active AS (
  UPDATE public.customer_subscriptions
  SET 
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE 
    subscription_status = 'active'
    AND current_period_end IS NULL
  RETURNING *
)
SELECT COUNT(*) AS fixed_active_count FROM updated_active;

-- Update canceled subscriptions with NULL current_period_end but canceled_at is set
-- For these, set current_period_end to 1 month after canceled_at
WITH updated_canceled AS (
  UPDATE public.customer_subscriptions
  SET 
    current_period_end = canceled_at + INTERVAL '1 month',
    updated_at = NOW()
  WHERE 
    subscription_status = 'canceled'
    AND current_period_end IS NULL
    AND canceled_at IS NOT NULL
  RETURNING *
)
SELECT COUNT(*) AS fixed_canceled_count FROM updated_canceled;

-- Update remaining subscriptions with NULL current_period_end based on created_at
-- This is a fallback for subscriptions without canceled_at
WITH updated_fallback AS (
  UPDATE public.customer_subscriptions
  SET 
    current_period_end = created_at + INTERVAL '1 month',
    updated_at = NOW()
  WHERE 
    current_period_end IS NULL
    AND created_at IS NOT NULL
  RETURNING *
)
SELECT COUNT(*) AS fixed_fallback_count FROM updated_fallback;

-- Run update_canceled_subscriptions logic to ensure proper status
-- Active with cancel_at_period_end=true for canceled during paid period
WITH updated_canceling AS (
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
SELECT COUNT(*) AS converted_to_canceling_count FROM updated_canceling;

-- Log the final count of subscriptions with NULL current_period_end
DO $$
DECLARE
  remaining_null_count INTEGER;
BEGIN
  -- Count remaining subscriptions with NULL end date
  SELECT COUNT(*) INTO remaining_null_count
  FROM public.customer_subscriptions
  WHERE current_period_end IS NULL
  AND subscription_status IN ('active', 'canceled');
  
  RAISE NOTICE 'After fixing: % subscriptions still have NULL current_period_end', remaining_null_count;
END$$;

COMMIT; 