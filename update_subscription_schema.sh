#!/bin/bash

# Script to update the subscription schema

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating subscription schema...${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Please install the Supabase CLI first:"
    echo "npm install -g supabase"
    exit 1
fi

# Run the SQL file using supabase db execute
echo -e "${GREEN}Running SQL migration...${NC}"
supabase db execute --file ./update_subscription_schema.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully updated subscription schema!${NC}"
    echo ""
    echo "This script made the following changes:"
    echo "1. Renamed subscription_status column to status"
    echo "2. Ensured cancel_at_period_end and current_period_end columns exist"
    echo "3. Created an index on the status column for better performance"
    echo ""
    echo "Next steps:"
    echo "1. Update any Edge Functions or webhooks that use subscription_status"
    echo "2. Deploy your updated functions"
else
    echo -e "${RED}Failed to execute the SQL script.${NC}"
    echo "You may need to run the SQL manually in the Supabase dashboard SQL editor."
    echo "Copy the contents of update_subscription_schema.sql and run it there."
fi

# Make this script executable
chmod +x update_subscription_schema.sh 