# Fixing Subscription Cancellation Issues

## The Problem

When users try to cancel their subscription, they may encounter this error:

```
POST http://localhost:8083/api/functions/v1/create-portal 500 (Internal Server Error)
Error canceling subscription: Error: Could not create management portal. Please contact support.
```

The issue is that the application doesn't store the Stripe subscription ID (`sub_*`) in the database, which is needed to create a customer portal link for managing the subscription.

## The Solution

We've implemented a comprehensive fix that includes:

1. A new Supabase Edge Function `get-stripe-subscription` that retrieves and stores the Stripe subscription ID
2. Updates to the subscription cancellation flow to fetch the subscription ID if it's missing
3. Updates to the checkout complete flow to retrieve the subscription ID upon subscription activation

## How to Implement the Fix

### 1. Deploy the Edge Function

Run the included deployment script:

```bash
./deploy_get_stripe_subscription.sh
```

If you're developing locally, you can serve the function with:

```bash
supabase functions serve get-stripe-subscription --env-file ./supabase/.env.local
```

### 2. Update Existing Subscriptions

For existing users with missing subscription IDs, run:

```sql
-- First identify users missing subscription IDs
SELECT id, user_id, stripe_customer_id, subscription_id, subscription_status 
FROM customer_subscriptions 
WHERE stripe_customer_id IS NOT NULL 
AND (subscription_id IS NULL OR subscription_id = 'stripe-subscription');
```

Then run the Edge Function for each of these users. The function will automatically:
1. Retrieve the subscription from Stripe
2. Update the database with the correct subscription ID

### 3. Verify the Fix

You can verify the fix is working by:

1. Checking the database for updated subscription IDs
2. Testing the cancellation flow (the customer portal should now open correctly)

```sql
-- Check that subscription IDs have been updated
SELECT id, user_id, stripe_customer_id, subscription_id, subscription_status 
FROM customer_subscriptions
WHERE subscription_status = 'active';
```

## What the Fix Does

When a user subscribes and later wants to cancel:

1. The app checks if a subscription ID exists in the database
2. If not, but a Stripe customer ID exists, it automatically calls the `get-stripe-subscription` endpoint
3. The endpoint retrieves the customer's subscriptions from Stripe and updates the database
4. The Stripe customer portal can then be successfully created for subscription management

## Manual Customer Resolution

For customers who still have issues, you can manually fix their subscription with:

```bash
# Get their user ID from the database
USER_ID="{the-user-id}"

# Fetch and update their subscription ID
curl -X POST http://localhost:8083/api/functions/v1/get-stripe-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d "{\"userId\":\"$USER_ID\"}"
```

Then check the database to confirm the update:

```sql
SELECT * FROM customer_subscriptions WHERE user_id = '{the-user-id}';
``` 