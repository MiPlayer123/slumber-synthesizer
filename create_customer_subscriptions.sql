-- Create the customer_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  customer_portal_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.customer_subscriptions IS 'Stores subscription information for users';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS customer_subscriptions_user_id_idx ON public.customer_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS customer_subscriptions_subscription_id_idx ON public.customer_subscriptions (subscription_id);
CREATE INDEX IF NOT EXISTS customer_subscriptions_stripe_customer_id_idx ON public.customer_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS customer_subscriptions_status_idx ON public.customer_subscriptions (subscription_status);

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own customer_subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Service role can manage customer_subscriptions" ON public.customer_subscriptions;

-- Add RLS (Row Level Security)
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own subscription data
CREATE POLICY "Users can view own customer_subscriptions"
  ON public.customer_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow service role to manage subscriptions
CREATE POLICY "Service role can manage customer_subscriptions"
  ON public.customer_subscriptions
  USING (true);

-- Grant access for authenticated users
GRANT SELECT ON public.customer_subscriptions TO authenticated;

-- Grant full access for service role
GRANT ALL ON public.customer_subscriptions TO service_role; 