-- Create policy to allow users to view their own subscription data
CREATE POLICY "Users can view own customer_subscriptions"
  ON public.customer_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow service role to manage subscriptions
CREATE POLICY "Service role can manage customer_subscriptions"
  ON public.customer_subscriptions
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant access for authenticated users
GRANT SELECT ON public.customer_subscriptions TO authenticated;

-- Grant full access for service role
GRANT ALL ON public.customer_subscriptions TO service_role; 