#!/bin/bash

# This script fixes the dream_analyses table structure in your local Supabase database

# Make sure the script is run from the project root
if [ ! -f "fix_dream_analyses.sql" ]; then
  echo "Error: This script must be run from the project root where fix_dream_analyses.sql is located."
  exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed. Please install it first."
  echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
  exit 1
fi

echo "Starting the fix for dream_analyses table..."

# Apply the fix using the Supabase CLI
if supabase db reset --db-url=$(grep SUPABASE_URL .env | cut -d '=' -f2)/postgres -p $(grep SUPABASE_DB_PASSWORD .env | cut -d '=' -f2) < fix_dream_analyses.sql; then
  echo "Oops, supabase db reset failed, trying direct method..."
  
  # Try direct connection if Supabase CLI fails
  if command -v psql &> /dev/null; then
    echo "Trying to apply the fix with direct psql connection..."
    psql -h localhost -p 5432 -U postgres -d postgres -f fix_dream_analyses.sql
  else
    echo "Direct connection attempt failed: psql not installed."
    echo "Please run the SQL query manually using the Supabase dashboard or your preferred SQL client."
  fi
fi

echo "Fix attempt completed."
echo "If you're running in development mode, please restart your Supabase instance or application."
echo "Then try accessing dream analyses again."

# Alternative instructions if script fails
echo ""
echo "If the automatic fix didn't work, you can manually run the SQL query:"
echo "1. Go to your Supabase dashboard (http://localhost:8000/project/default/editor)"
echo "2. Open the SQL editor"
echo "3. Copy and paste the contents of fix_dream_analyses.sql"
echo "4. Run the query"
echo ""
echo "After applying the fix, restart your application." 