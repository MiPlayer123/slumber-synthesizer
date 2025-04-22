#!/bin/bash

# This script fixes the subscription status for paid users

# Make sure the script is run from the project root
if [ ! -f "fix_subscription_status.sql" ]; then
  echo "Error: This script must be run from the project root where fix_subscription_status.sql is located."
  exit 1
fi

echo "Starting the fix for subscription status..."

# Try direct connection with Supabase
if command -v psql &> /dev/null; then
  echo "Trying to apply the fix with direct psql connection..."
  # For local development
  psql -h localhost -p 5432 -U postgres -d postgres -f fix_subscription_status.sql
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to local database."
    echo "Please run the SQL query manually using the Supabase dashboard or your preferred SQL client."
  else
    echo "Successfully applied subscription status fix!"
  fi
else
  echo "Could not find psql command. Please run the SQL manually."
fi

# Option to update a specific user by ID
if [ "$1" != "" ]; then
  USER_ID=$1
  echo "Updating specific user: $USER_ID"
  
  if command -v psql &> /dev/null; then
    psql -h localhost -p 5432 -U postgres -d postgres -c "
    UPDATE public.customer_subscriptions 
    SET subscription_status = 'active', updated_at = NOW() 
    WHERE user_id = '$USER_ID';
    
    SELECT * FROM public.customer_subscriptions WHERE user_id = '$USER_ID';
    "
    
    if [ $? -eq 0 ]; then
      echo "Successfully updated user $USER_ID"
    else
      echo "Failed to update user $USER_ID"
    fi
  else
    echo "Please run this SQL query to update the specific user:"
    echo "UPDATE public.customer_subscriptions SET subscription_status = 'active', updated_at = NOW() WHERE user_id = '$USER_ID';"
  fi
fi

echo ""
echo "Alternative instructions if script fails:"
echo "1. Go to your Supabase dashboard (http://localhost:8000/project/default/editor)"
echo "2. Open the SQL editor"
echo "3. Copy and paste the contents of fix_subscription_status.sql"
echo "4. Run the query"
echo ""
echo "After applying the fix, restart your application." 