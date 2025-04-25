#!/bin/bash

# Script to update customer_subscriptions table with cancellation tracking fields

echo "Updating customer_subscriptions table to track cancellation status..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Apply the SQL update directly
echo "Applying SQL update to add cancellation tracking fields..."

supabase db query --file update_subscription_table.sql

# Check if the update was successful
if [ $? -eq 0 ]; then
  echo "Successfully updated customer_subscriptions table!"
  
  # Add a check for any existing subscriptions that need to be updated
  echo "Checking for any active subscriptions that should be marked as canceling..."
  
  # Run a verification query
  supabase db query --file verify_subscription_status.sql
  
  echo ""
  echo "Next steps:"
  echo "1. Deploy the updated Edge Functions with: ./deploy_all_functions.sh"
  echo "2. Make sure your Stripe webhook is configured to receive subscription update events"
  echo ""
else
  echo "Failed to update the database. Please check the error messages above."
  exit 1
fi

# Deploy the updated functions
echo "Would you like to deploy the updated Edge Functions now? (y/n)"
read -r choice

if [[ "$choice" =~ ^[Yy]$ ]]; then
  echo "Deploying updated Edge Functions..."
  ./deploy_all_functions.sh
else
  echo "Skipping function deployment. Remember to run ./deploy_all_functions.sh later."
fi

# Mark script as executable
chmod +x deploy_subscription_table_update.sh 