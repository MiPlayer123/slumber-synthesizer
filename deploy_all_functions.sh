#!/bin/bash

# This script deploys all the Edge Functions needed for the subscription system

echo "Deploying all Stripe and subscription-related Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Deploy each function
echo "Deploying get-subscription function..."
supabase functions deploy get-subscription --no-verify-jwt

echo "Deploying get-stripe-subscription function..."
supabase functions deploy get-stripe-subscription --no-verify-jwt

echo "Deploying create-portal function..."
supabase functions deploy create-portal --no-verify-jwt

echo "Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook --no-verify-jwt

echo "Deploying subscription-cron function..."
supabase functions deploy subscription-cron --no-verify-jwt

# Set up the cron schedule for subscription-cron
echo "Setting up scheduled execution for subscription-cron..."
supabase functions schedule subscription-cron --cron "0 0 * * *" --no-verify-jwt

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Successfully deployed all subscription-related Edge Functions!"
  echo ""
  echo "Next steps:"
  echo "1. Make sure your Stripe webhook is set up to receive events"
  echo "2. Verify the following environment variables are set in your Supabase dashboard:"
  echo "   - STRIPE_SECRET_KEY"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - SITE_URL (optional, defaults to http://localhost:8080)"
  echo ""
  echo "You can view function logs with:"
  echo "supabase functions logs"
  echo ""
else
  echo "Failed to deploy one or more functions. Please check the error messages above."
fi

# Make this script executable
chmod +x deploy_all_functions.sh 