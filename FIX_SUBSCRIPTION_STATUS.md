# Fixing Subscription Status

## The Issue

We've identified an issue where users who have successfully subscribed through Stripe are not getting proper access to premium features. This happens because their subscription records in the database have `NULL` values for the `subscription_status` field, even though they have been assigned a `stripe_customer_id`.

The problem appears like this in the database:

```sql
SELECT * FROM customer_subscriptions WHERE user_id = '2a9413c3-a85a-4167-bb36-b170aac6d6ac';

id                                   | user_id                              | stripe_customer_id   | subscription_id | subscription_status | customer_portal_url
-------------------------------------|--------------------------------------|----------------------|-----------------|---------------------|--------------------
e2563ce4-f599-4f45-8e6d-6f8778d0f39e | 2a9413c3-a85a-4167-bb36-b170aac6d6ac | cus_SArsq26PDom7QJ   | null            | null                | null
```

When the `subscription_status` is `NULL`, the application doesn't recognize the subscription as active, and the user doesn't get premium features.

## How to Fix

We've provided both code updates and a fix script that will:

1. Update all subscription records that have a stripe_customer_id but missing subscription_status
2. Set these subscriptions to 'active' status
3. Ensure future subscriptions always get proper status

### Option 1: Run the Automated Fix Script

To fix all existing users at once:

```bash
./fix_subscription_status.sh
```

To fix a specific user by ID:

```bash
./fix_subscription_status.sh 2a9413c3-a85a-4167-bb36-b170aac6d6ac
```

### Option 2: Apply the Fix Manually

If the script doesn't work, you can run this SQL directly:

```sql
-- Fix all users with stripe_customer_id
UPDATE public.customer_subscriptions
SET subscription_status = 'active', updated_at = NOW()
WHERE stripe_customer_id IS NOT NULL 
AND (subscription_status IS NULL OR subscription_status != 'active');

-- Fix a specific user
UPDATE public.customer_subscriptions
SET subscription_status = 'active', updated_at = NOW()
WHERE user_id = '2a9413c3-a85a-4167-bb36-b170aac6d6ac';
```

## Code Changes

The application code has been updated to:

1. Set subscription_status to 'active' when users complete checkout
2. Automatically detect and fix NULL subscription_status values when users have a stripe_customer_id
3. Ensure future subscriptions always have the correct status

## After the Fix

After applying the fix, all paid users should have:

1. Unlimited image generations
2. Unlimited dream analyses
3. A proper "Premium Active" status in their account

## Verifying the Fix

You can verify the fix has been applied by checking:

```sql
SELECT id, user_id, stripe_customer_id, subscription_status, updated_at
FROM customer_subscriptions
WHERE subscription_status = 'active';
```

All users with a stripe_customer_id should now have an 'active' subscription_status. 