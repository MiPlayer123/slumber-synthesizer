#!/bin/bash

# This script deploys the get-stripe-subscription Edge Function

echo "Deploying get-stripe-subscription Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Navigate to project directory if needed
# cd /path/to/your/project

# Deploy the Edge Function
supabase functions deploy get-stripe-subscription --no-verify-jwt

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Successfully deployed get-stripe-subscription Edge Function!"
  echo ""
  echo "Next steps:"
  echo "1. Make sure your Stripe webhook is set up to receive events"
  echo "2. Make sure the STRIPE_SECRET_KEY is set in your Supabase dashboard"
  echo ""
  echo "You can also run this function locally for development with:"
  echo "supabase functions serve get-stripe-subscription --env-file ./supabase/.env.local"
  echo ""
else
  echo "Failed to deploy the function. Please check the error messages above."
fi 