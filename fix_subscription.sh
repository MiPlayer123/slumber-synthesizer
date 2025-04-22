#!/bin/bash

# Set the user ID from the error message
USER_ID="3a9a98cb-73f2-4273-9c2e-3593ed890428"

# Create a temporary SQL file for subscription fix
cat << EOF > temp_fix_subscription.sql
-- Force update subscription status to active for the specific user
BEGIN;

-- First make sure the table exists with correct columns
DO \$\$
BEGIN
  -- Make sure table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'customer_subscriptions'
  ) THEN
    CREATE TABLE public.customer_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      subscription_id TEXT DEFAULT 'manual-activation',
      subscription_status TEXT DEFAULT 'active',
      customer_portal_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    -- Create necessary policies
    ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own customer_subscriptions"
      ON public.customer_subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
    
    GRANT SELECT ON public.customer_subscriptions TO authenticated;
    GRANT ALL ON public.customer_subscriptions TO service_role;
  END IF;
  
  -- Make sure we have a subscription_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'customer_subscriptions' 
      AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT DEFAULT 'active';
  END IF;
END \$\$;

-- Check if a record already exists for this user
DO \$\$
DECLARE
  existing_record_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_record_count 
  FROM public.customer_subscriptions
  WHERE user_id = '$USER_ID';
  
  IF existing_record_count > 0 THEN
    -- Update the existing record
    UPDATE public.customer_subscriptions
    SET 
      subscription_status = 'active',
      subscription_id = COALESCE(subscription_id, 'manual-activation'),
      updated_at = now()
    WHERE user_id = '$USER_ID';
  ELSE
    -- Insert a new record
    INSERT INTO public.customer_subscriptions (
      user_id, 
      subscription_status, 
      subscription_id, 
      created_at, 
      updated_at
    ) VALUES (
      '$USER_ID', 
      'active', 
      'manual-activation', 
      now(), 
      now()
    );
  END IF;
END \$\$;

COMMIT;
EOF

# Use the command below to run the SQL script against your database
# Replace <DATABASE_URL> with your actual database URL or connection string
echo "To run this SQL script against your database, use one of these methods:"
echo ""
echo "1. If using Supabase CLI:"
echo "   supabase db reset --db-url postgresql://postgres:remDBms987\$@db.lucidrem.supabase.co:5432/postgres"
echo ""
echo "2. If using psql directly:"
echo "   PGPASSWORD=remDBms987\$ psql -h db.lucidrem.supabase.co -U postgres -d postgres -f temp_fix_subscription.sql"
echo ""
echo "3. Open the Supabase dashboard, go to the SQL editor, and paste the contents of temp_fix_subscription.sql"
echo ""
echo "SQL script saved to: temp_fix_subscription.sql"

# Clean up
chmod +x fix_subscription.sh 