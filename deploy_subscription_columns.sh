#!/bin/bash

# Script to add the necessary columns for subscription cancellation

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Adding subscription cancellation columns to the database...${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Please install the Supabase CLI first:"
    echo "npm install -g supabase"
    exit 1
fi

# Run the SQL file using supabase db execute
echo -e "${GREEN}Running SQL migration...${NC}"
supabase db execute --file ./add_cancellation_columns.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully added subscription cancellation columns!${NC}"
    echo ""
    echo "The following columns have been added to the customer_subscriptions table:"
    echo "1. cancel_at_period_end (BOOLEAN) - Indicates if subscription will cancel at period end"
    echo "2. canceled_at (TIMESTAMPTZ) - When the subscription was canceled"
    echo "3. current_period_end (TIMESTAMPTZ) - When the current subscription period ends"
    echo ""
    echo "Also updated any active subscriptions with cancel_at_period_end=TRUE to have status 'canceling'"
else
    echo -e "${RED}Failed to execute the SQL script.${NC}"
    echo "You may need to run the SQL manually in the Supabase dashboard SQL editor."
    echo "Copy the contents of add_cancellation_columns.sql and run it there."
fi

# Make this script executable
chmod +x deploy_subscription_columns.sh 