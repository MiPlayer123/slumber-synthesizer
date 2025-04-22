# Subscription Cancellation Fix

## Problem

Users cannot cancel their subscriptions due to a 500 error from the `create-portal` endpoint:

```
POST http://localhost:8083/api/functions/v1/create-portal 500 (Internal Server Error)
Error canceling subscription: Error: Could not create management portal. Please contact support.
```

Even though the subscription ID is successfully retrieved (`sub_1RGWPo04pWv1UbxAP4HhF06r`), the create-portal function is failing.

## Solution

We've implemented a robust fix for this issue:

1. Added comprehensive logging to the `create-portal` Edge Function
2. Improved error handling to provide more detailed error messages
3. Added validation for customer IDs and environment variables
4. Implemented a fallback mechanism to handle portal creation failures

## Implementation Details

### 1. Updated Edge Functions

#### a. create-portal

The `create-portal` Edge Function has been enhanced with:
- Detailed logging to track request flow
- Better error handling to identify specific issues
- Validation of environment variables and input data
- Better exception handling for Stripe API calls

#### b. get-stripe-subscription

This function now:
- Properly retrieves the Stripe subscription ID
- Updates the database with the subscription information
- Returns detailed subscription status

### 2. Frontend Updates

The Settings component has been updated to:
- Log detailed information about the cancellation process
- Handle API errors more gracefully
- Provide a fallback option when create-portal fails
- Direct users to the Stripe billing portal as a backup option

### 3. Deployment Scripts

Two deployment scripts have been created:
- `deploy_get_stripe_subscription.sh` - Deploys the get-stripe-subscription function
- `deploy_create_portal.sh` - Deploys the updated create-portal function

## How to Deploy

1. First, deploy the updated create-portal function:
   ```bash
   ./deploy_create_portal.sh
   ```

2. If you haven't already, deploy the get-stripe-subscription function:
   ```bash
   ./deploy_get_stripe_subscription.sh
   ```

3. Ensure environment variables are properly set in your Supabase project:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - STRIPE_SECRET_KEY
   - SITE_URL (optional, defaults to http://localhost:8080)

## Troubleshooting

If issues persist:

1. Check the Edge Function logs:
   ```bash
   supabase functions logs
   ```

2. Verify that subscription records have a valid stripe_customer_id:
   ```sql
   SELECT id, user_id, stripe_customer_id, subscription_id 
   FROM customer_subscriptions 
   WHERE user_id = 'USER_ID_HERE';
   ```

3. Ensure the stripe_customer_id follows the format 'cus_XXXX'

4. If the direct Stripe portal still fails, users will be redirected to the support form

## Important Note

The fallback mechanism uses a direct link to the Stripe billing portal. You should update this URL in the Settings component to your specific Stripe portal URL. 