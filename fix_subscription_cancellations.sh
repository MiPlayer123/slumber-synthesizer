#!/bin/bash

echo "===== Slumber Synthesizer Subscription Cancellation Fix ====="
echo "This script will deploy updated edge functions and fix subscription data."

# Step 1: Deploy updated edge functions
echo ""
echo "Step 1: Deploying updated edge functions..."

# Deploy the get-subscription function
echo "Deploying get-subscription function..."
supabase functions deploy get-subscription

# Deploy the stripe-webhook function
echo "Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook

# Step 2: Run the SQL update scripts
echo ""
echo "Step 2: Running SQL scripts to fix subscription data..."

# Fix NULL period_end dates in subscriptions
echo "Running fix_subscription_periods.sql..."
supabase db execute -f fix_subscription_periods.sql

# Fix cancellation statuses
echo "Running update_canceled_subscriptions.sql..."
supabase db execute -f update_canceled_subscriptions.sql

echo ""
echo "===== Fix completed! ====="
echo "The subscription cancellation issues should now be resolved."
echo ""
echo "To verify the fix:"
echo "1. Check that canceled subscriptions in their paid period show the premium UI"
echo "2. They should display with 'Canceling' status in a gold/amber badge"
echo "3. Check the database to confirm current_period_end values are populated"
echo "4. Ensure cancel_at_period_end=true for canceled subscriptions in their paid period"
echo ""
echo "For more information, please see SUBSCRIPTION_CANCELLATION_FIX.md" 