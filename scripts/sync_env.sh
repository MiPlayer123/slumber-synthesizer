#!/bin/bash

# This script helps sync environment variables between root and supabase functions

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Synchronizing environment variables...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found in project root${NC}"
  echo -e "${YELLOW}Please create an .env file based on .env.example${NC}"
  exit 1
fi

# Create supabase directory if it doesn't exist
if [ ! -d "supabase" ]; then
  echo -e "${YELLOW}Supabase directory not found, creating it...${NC}"
  mkdir -p supabase
fi

# Create secrets directory for Supabase functions
if [ ! -d "supabase/.secrets" ]; then
  echo -e "${YELLOW}Creating .secrets directory for Supabase functions...${NC}"
  mkdir -p supabase/.secrets
fi

# Create symbolic link to main .env file
echo -e "${GREEN}Creating environment file for Supabase functions...${NC}"
ln -sf ../.env supabase/.env

# Export environment variables to .secrets files for Supabase Edge Functions
echo -e "${GREEN}Exporting API keys to Supabase Edge Functions...${NC}"

# Export OpenAI API Key
if grep -q "OPENAI_API_KEY" .env; then
  OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)
  echo "$OPENAI_API_KEY" > supabase/.secrets/OPENAI_API_KEY
  echo -e "${GREEN}✓ Exported OPENAI_API_KEY${NC}"
else
  echo -e "${YELLOW}Warning: OPENAI_API_KEY not found in .env${NC}"
fi

# Export Gemini API Key
if grep -q "GEMINI_API_KEY" .env; then
  GEMINI_API_KEY=$(grep "GEMINI_API_KEY" .env | cut -d '=' -f2)
  echo "$GEMINI_API_KEY" > supabase/.secrets/GEMINI_API_KEY
  echo -e "${GREEN}✓ Exported GEMINI_API_KEY${NC}"
else
  echo -e "${YELLOW}Warning: GEMINI_API_KEY not found in .env${NC}"
fi

# Export Supabase Service Role Key
if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
  SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env | cut -d '=' -f2)
  echo "$SUPABASE_SERVICE_ROLE_KEY" > supabase/.secrets/SUPABASE_SERVICE_ROLE_KEY
  echo -e "${GREEN}✓ Exported SUPABASE_SERVICE_ROLE_KEY${NC}"
else
  echo -e "${YELLOW}Warning: SUPABASE_SERVICE_ROLE_KEY not found in .env${NC}"
fi

# Export Stripe Secret Key
if grep -q "STRIPE_SECRET_KEY" .env; then
  STRIPE_SECRET_KEY=$(grep "STRIPE_SECRET_KEY" .env | cut -d '=' -f2)
  echo "$STRIPE_SECRET_KEY" > supabase/.secrets/STRIPE_SECRET_KEY
  echo -e "${GREEN}✓ Exported STRIPE_SECRET_KEY${NC}"
else
  echo -e "${YELLOW}Warning: STRIPE_SECRET_KEY not found in .env${NC}"
fi

# Make script executable
chmod +x supabase/.secrets/*

echo -e "${GREEN}Environment synchronization complete!${NC}"
echo -e "${YELLOW}Note: Remember to run this script whenever you update your .env file${NC}" 