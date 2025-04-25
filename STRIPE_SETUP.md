# Stripe & Supabase Subscription Setup Guide

This guide will help you set up the subscription system using Stripe and Supabase Edge Functions.

## Prerequisites

- A Stripe account
- A Supabase project
- Node.js (for running Supabase CLI)

## 1. Set Up Stripe Products and Prices

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Create a product for your subscription:
   - Go to **Products** > **Add Product**
   - Name it (e.g., "LucidRem Premium")
   - Add a description
   - Create two price points:
     - Monthly: $6/month, recurring
     - 6-Month: $30/6 months, recurring
   - Take note of the price IDs (they start with `price_`)

## 2. Set Up Supabase Database

1. Execute the SQL migrations to create:
   - The `customer_subscriptions` table (located in `supabase/migrations/20240606_create_subscription_tables.sql`)
   - The counting functions (located in `supabase/migrations/20240607_create_count_functions.sql`)

2. Make sure the Row Level Security (RLS) policies are applied to protect the data.

## 3. Set Up Supabase Edge Functions

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Deploy the Edge Functions to your Supabase project:
   ```bash
   supabase functions deploy create-checkout --project-ref your-project-ref
   supabase functions deploy get-subscription --project-ref your-project-ref
   supabase functions deploy stripe-webhook --project-ref your-project-ref
   supabase functions deploy verify-payment --project-ref your-project-ref
   ```

## 4. Payment Verification Flow

To ensure users don't receive a free subscription without successful payment, the following verification process is in place:

### Frontend Flow

1. When a user starts checkout, they are redirected to Stripe Checkout
2. After payment:
   - Success: User is redirected to the success URL with `session_id` parameter
   - Canceled: User is redirected to the cancel URL
3. On the success page, the app verifies the payment with Stripe before activating the subscription:
   - Calls verify-payment endpoint with the session_id
   - Only marks subscription as active if verification confirms payment
   - Handles cases where the user might abandon checkout or close the tab

### Backend Verification

1. **verify-payment** Edge Function:
   - Checks that the Stripe session exists and has payment_status = "paid"
   - For subscriptions, confirms a subscription object exists and is active
   - Verifies the customer ID matches our records
   - Only returns success if all verification steps pass

2. **stripe-webhook** Edge Function handles events from Stripe:
   - `checkout.session.completed`: Updates subscription record with subscription_id
   - `invoice.payment_succeeded`: Handles recurring payments, ensures subscription remains active
   - `customer.subscription.updated`: Updates metadata such as cancellation status
   - `customer.subscription.deleted`: Marks subscription as canceled

### Failsafes

The system includes multiple failsafes to prevent unauthorized access:

1. The front-end CheckoutComplete component never automatically marks a subscription as active
2. The verify-payment endpoint must confirm with Stripe that payment was successful
3. The webhook handler processes events from Stripe in real-time to keep subscription status in sync
4. Database queries check for valid subscription_id and active status before granting premium features

## 5. Set Up Stripe Webhook

1. In your Stripe Dashboard, go to **Developers** > **Webhooks**.
2. Click **Add endpoint**.
3. For the endpoint URL, enter your Supabase Edge Function webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. Select the following events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the signing secret (starts with `whsec_`) and use it as the `STRIPE_WEBHOOK_SECRET` environment variable.

## 6. Configure Environment Variables for the Frontend

Create or update your `.env` file with the following variables:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_SIXMONTH_PRICE_ID=price_...

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Application URLs
SITE_URL=http://localhost:5173  # For development
# SITE_URL=https://your-app-url.com  # For production
```

## 7. Testing the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Settings page and go to the Subscription tab.
3. Try subscribing with a test card (use Stripe's test cards, e.g. `4242 4242 4242 4242` with any future expiry date and any CVC).
4. Check in your Stripe Dashboard > Customers to see if the subscription was created.
5. Verify that the subscription appears correctly in your application.

## Troubleshooting

### Checkout not working:

- Check browser console for errors
- Verify that the Edge Functions are deployed and correctly set up
- Verify environment variables are correctly set
- Check Supabase Edge Function logs for errors

### Webhook not processing events:

- Check Stripe Dashboard > Webhooks for failed webhook attempts
- Verify the webhook secret is correct
- Check Supabase Edge Function logs for any errors

### Subscription status not updating:

- Check if the webhook is receiving and processing events correctly
- Verify RLS policies allow the updates
- Check the SQL schema for any issues with the subscription status updates

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Authentication with React](https://supabase.com/docs/guides/auth/auth-helpers/react) 