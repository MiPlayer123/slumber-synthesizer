#!/bin/bash

# Exit on error
set -e

echo "Deploying subscription-related edge functions..."

# Deploy the migration to add unique constraint
echo "Applying migration with unique constraint on user_id..."
supabase migration up

# Deploy the get-stripe-subscription function
echo "Deploying get-stripe-subscription function..."
supabase functions deploy get-stripe-subscription --no-verify-jwt

# Deploy the verify-payment function with updated code
echo "Deploying verify-payment function..."
supabase functions deploy verify-payment --no-verify-jwt

echo "Deployment complete!"
echo "Now run the following to check logs:"
echo "supabase functions logs get-stripe-subscription --follow"
echo "supabase functions logs verify-payment --follow"
echo "supabase functions logs stripe-webhook --follow" 