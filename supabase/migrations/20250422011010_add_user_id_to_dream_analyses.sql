-- Add user_id column to dream_analyses table
ALTER TABLE dream_analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_dream_analyses_user_id ON dream_analyses(user_id);

-- Add a foreign key constraint to ensure data integrity
ALTER TABLE dream_analyses 
  ADD CONSTRAINT fk_dream_analyses_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
