-- Create function to count user images since a specific date
CREATE OR REPLACE FUNCTION public.count_user_images_since(user_id_input UUID, since_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM dreams
  WHERE 
    user_id = user_id_input AND
    created_at >= since_date AND
    image_url IS NOT NULL;
$$;

-- Create function to count user analyses since a specific date
CREATE OR REPLACE FUNCTION public.count_user_analyses_since(user_id_input UUID, since_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM dream_analyses
  WHERE 
    user_id = user_id_input AND
    created_at >= since_date;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_user_images_since TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_user_analyses_since TO authenticated; 