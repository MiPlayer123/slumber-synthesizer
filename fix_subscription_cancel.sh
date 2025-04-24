#!/bin/bash

# Script to fix subscription cancellation status

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Fixing subscription cancellation status...${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Please install the Supabase CLI first:"
    echo "npm install -g supabase"
    exit 1
fi

# Run the SQL file using supabase db execute
echo -e "${GREEN}Running SQL fix...${NC}"
supabase db execute --file ./fix_subscription_cancel_status.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully fixed subscription cancellation status!${NC}"
    echo ""
    echo "This script fixed the following issues:"
    echo "1. Changed subscriptions with status='canceled' but current_period_end in future to active with cancel_at_period_end=true"
    echo "2. Set cancel_at_period_end=true on active subscriptions that were canceled but still in current period"
    echo ""
    echo "Use the following SQL to check the status:"
    echo "SELECT subscription_status, cancel_at_period_end, COUNT(*) FROM customer_subscriptions GROUP BY subscription_status, cancel_at_period_end;"
else
    echo -e "${RED}Failed to execute the SQL script.${NC}"
    echo "You may need to run the SQL manually in the Supabase dashboard SQL editor."
    echo "Copy the contents of fix_subscription_cancel_status.sql and run it there."
fi

# Make this script executable
chmod +x fix_subscription_cancel.sh 