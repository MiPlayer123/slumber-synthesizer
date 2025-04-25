#!/bin/bash

# Script to manually trigger the subscription-cron function
# This is useful for testing or handling missed cron runs

echo "Manually triggering the subscription-cron function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Call the function
echo "Invoking subscription-cron function..."
supabase functions serve subscription-cron --method GET

# Check if the invocation was successful
if [ $? -eq 0 ]; then
  echo "Successfully ran subscription-cron function!"
  echo "Check the logs for details on which subscriptions were processed."
  echo ""
  echo "If you need to view detailed logs, run:"
  echo "supabase functions logs subscription-cron"
else
  echo "Failed to run the subscription-cron function. Please check the error messages above."
fi

# Make script executable
chmod +x run_subscription_cron.sh 