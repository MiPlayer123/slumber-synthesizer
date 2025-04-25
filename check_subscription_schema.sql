-- Check if all required columns exist
DO $$
DECLARE
    column_check RECORD;
BEGIN
    -- Check for cancel_at_period_end column
    SELECT 1 INTO column_check
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'cancel_at_period_end';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Missing column: cancel_at_period_end - Will be added by migration';
    ELSE
        RAISE NOTICE 'Column exists: cancel_at_period_end ✓';
    END IF;
    
    -- Check for canceled_at column
    SELECT 1 INTO column_check
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'canceled_at';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Missing column: canceled_at - Will be added by migration';
    ELSE
        RAISE NOTICE 'Column exists: canceled_at ✓';
    END IF;
    
    -- Check for current_period_end column
    SELECT 1 INTO column_check
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'current_period_end';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Missing column: current_period_end - Will be added by migration';
    ELSE
        RAISE NOTICE 'Column exists: current_period_end ✓';
    END IF;
END $$; 