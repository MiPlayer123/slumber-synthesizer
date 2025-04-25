// Directly create a new Supabase edge function that adds the subscription_status column
// No need for external dependencies

// Create the SQL file content
const sqlContent = `-- Add subscription_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customer_subscriptions' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT;
    RAISE NOTICE 'Added subscription_status column';
    
    -- Copy values from status to subscription_status if status exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customer_subscriptions' 
      AND column_name = 'status'
    ) THEN
      UPDATE public.customer_subscriptions
      SET subscription_status = status;
      RAISE NOTICE 'Copied values from status to subscription_status';
    END IF;
    
  ELSE
    RAISE NOTICE 'subscription_status column already exists';
  END IF;
END $$;`;

// Create the edge function file content
const functionContent = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Function to log debug info
const logDebug = (message, data) => {
  console.log(\`[fix-subscription-status] \${message}\`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  try {
    // Initialize the Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute SQL directly since we're running with service role
    const result = await supabase.rpc('exec_sql', {
      sql_string: \`
      -- Add subscription_status column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'customer_subscriptions' 
          AND column_name = 'subscription_status'
        ) THEN
          ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT;
          RAISE NOTICE 'Added subscription_status column';
          
          -- Copy values from status to subscription_status if status exists
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'customer_subscriptions' 
            AND column_name = 'status'
          ) THEN
            UPDATE public.customer_subscriptions
            SET subscription_status = status;
            RAISE NOTICE 'Copied values from status to subscription_status';
          END IF;
          
        ELSE
          RAISE NOTICE 'subscription_status column already exists';
        END IF;
      END $$;
      \`
    });

    logDebug("SQL execution result", result);

    // Check the current schema
    const { data: tableInfo, error: tableError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      logDebug("Error checking table after update", tableError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tableError.message,
          message: "Failed to verify table structure after update"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const columns = tableInfo && tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [];
    const hasSubscriptionStatus = columns.includes('subscription_status');
    
    logDebug("Table columns after update", columns);
    logDebug("Has subscription_status column:", hasSubscriptionStatus);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Subscription status column check completed",
        hasSubscriptionStatus,
        columns
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    logDebug("Unexpected error", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: "Unexpected error executing fix"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});`;

// Print instructions to manually apply changes
console.log(`
To fix the missing subscription_status column, follow these steps:

1. Create a new SQL migration file for Supabase:
   supabase/migrations/[date]_add_subscription_status.sql

   With this content:
   ${sqlContent}

2. Create a new Edge Function in Supabase:
   supabase/functions/fix-subscription-status/index.ts

   With this content:
   ${functionContent}

3. Deploy the SQL migration:
   npx supabase db push

4. Deploy the edge function:
   npx supabase functions deploy fix-subscription-status

5. Invoke the edge function:
   npx supabase functions invoke fix-subscription-status

This should add the missing subscription_status column to your customer_subscriptions table.
`); 