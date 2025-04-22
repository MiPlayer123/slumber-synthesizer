-- Verify subscription status and fix inconsistencies

-- First check if any subscriptions with cancel_at_period_end but still marked as active
SELECT 
  id, 
  user_id, 
  subscription_id, 
  subscription_status, 
  cancel_at_period_end, 
  current_period_end
FROM 
  public.customer_subscriptions
WHERE 
  cancel_at_period_end = TRUE 
  AND subscription_status = 'active';

-- Fix any subscriptions with cancel_at_period_end but still marked as active
UPDATE public.customer_subscriptions
SET 
  subscription_status = 'canceling',
  updated_at = NOW()
WHERE 
  cancel_at_period_end = TRUE 
  AND subscription_status = 'active';

-- Check for any expired canceled subscriptions that should be marked as inactive
SELECT 
  id, 
  user_id, 
  subscription_id, 
  subscription_status, 
  cancel_at_period_end, 
  current_period_end
FROM 
  public.customer_subscriptions
WHERE 
  subscription_status = 'canceling'
  AND current_period_end < NOW();

-- Fix any expired canceling subscriptions
UPDATE public.customer_subscriptions
SET 
  subscription_status = 'canceled',
  updated_at = NOW()
WHERE 
  subscription_status = 'canceling'
  AND current_period_end < NOW();

-- Show summary of subscription statuses after fixes
SELECT 
  subscription_status, 
  COUNT(*) as count
FROM 
  public.customer_subscriptions
GROUP BY 
  subscription_status
ORDER BY 
  count DESC; 