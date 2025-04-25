-- Create usage_logs table for tracking feature usage
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON usage_logs(type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Add Row Level Security (RLS) policies
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage logs
CREATE POLICY usage_logs_select_policy
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own usage logs
CREATE POLICY usage_logs_insert_policy
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own usage logs
CREATE POLICY usage_logs_update_policy
  ON usage_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service_role to perform all actions
CREATE POLICY usage_logs_service_role_policy
  ON usage_logs
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Also set up a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON usage_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Create function to count usage logs since a specific date for a user
CREATE OR REPLACE FUNCTION public.count_user_usage_since(
  user_id_input UUID, 
  usage_type TEXT,
  since_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(count), 0)::INTEGER
  FROM usage_logs
  WHERE 
    user_id = user_id_input AND
    type = usage_type AND
    created_at >= since_date;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_user_usage_since TO authenticated;
