#!/bin/bash

# This script deploys the updated create-portal Edge Function

echo "Deploying create-portal Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

# Navigate to project directory if needed
# cd /path/to/your/project

# Deploy the Edge Function
supabase functions deploy create-portal --no-verify-jwt

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Successfully deployed create-portal Edge Function!"
  echo ""
  echo "Next steps:"
  echo "1. Make sure the STRIPE_SECRET_KEY is set in your Supabase dashboard"
  echo "2. Check that environment variables are properly set"
  echo ""
  echo "Environment variables needed:"
  echo "- SUPABASE_URL"
  echo "- SUPABASE_SERVICE_ROLE_KEY"
  echo "- STRIPE_SECRET_KEY"
  echo "- SITE_URL (optional, defaults to http://localhost:8080)"
  echo ""
  echo "You can check the function logs with:"
  echo "supabase functions logs"
  echo ""
else
  echo "Failed to deploy the function. Please check the error messages above."
fi 