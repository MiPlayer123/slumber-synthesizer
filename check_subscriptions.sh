#!/bin/bash

# Script to manually check subscription statuses and fix any issues

echo "Checking subscription statuses..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Query all subscriptions
echo "Current subscription status counts:"
supabase db query "SELECT subscription_status, COUNT(*) as count FROM public.customer_subscriptions GROUP BY subscription_status ORDER BY count DESC;"

echo ""
echo "Checking for subscriptions with cancel_at_period_end but wrong status:"
supabase db query "SELECT subscription_status, cancel_at_period_end, COUNT(*) as count FROM public.customer_subscriptions GROUP BY subscription_status, cancel_at_period_end ORDER BY subscription_status, cancel_at_period_end;"

echo ""
echo "Checking for expired canceling subscriptions:"
supabase db query "SELECT id, user_id, subscription_id, subscription_status, cancel_at_period_end, current_period_end FROM public.customer_subscriptions WHERE subscription_status = 'canceling' AND current_period_end < NOW();"

echo ""
echo "Would you like to fix inconsistent subscription statuses? (y/n)"
read -r choice

if [[ "$choice" =~ ^[Yy]$ ]]; then
  echo "Fixing subscription statuses..."
  
  # Fix active subscriptions with cancel_at_period_end = true
  echo "1. Updating active subscriptions with cancel_at_period_end to 'canceling'..."
  supabase db query "UPDATE public.customer_subscriptions SET subscription_status = 'canceling', updated_at = NOW() WHERE subscription_status = 'active' AND cancel_at_period_end = TRUE;"
  
  # Fix expired canceling subscriptions
  echo "2. Updating expired canceling subscriptions to 'canceled'..."
  supabase db query "UPDATE public.customer_subscriptions SET subscription_status = 'canceled', updated_at = NOW() WHERE subscription_status = 'canceling' AND current_period_end < NOW();"
  
  echo "3. Running the subscription-cron function to handle any other edge cases..."
  ./run_subscription_cron.sh
  
  echo "Done fixing subscription statuses!"
else
  echo "No changes made to subscription statuses."
fi

# Make script executable
chmod +x check_subscriptions.sh 