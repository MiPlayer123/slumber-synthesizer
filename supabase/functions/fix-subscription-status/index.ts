import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Function to log debug info
const logDebug = (message: string, data?: any) => {
  console.log(
    `[fix-subscription-status] ${message}`,
    data ? JSON.stringify(data) : "",
  );
};

serve(async () => {
  try {
    // Initialize the Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute SQL directly since we're running with service role
    // First try approach using rpc
    try {
      const result = await supabase.rpc("exec_sql", {
        sql_string: `
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
        `,
      });
      logDebug("SQL execution result via RPC", result);
    } catch (rpcError) {
      logDebug(
        "RPC error (this is normal if the function doesn't exist)",
        rpcError,
      );

      // If rpc fails, try using direct SQL query
      logDebug("Trying direct SQL query...");

      // Direct SQL if RPC fails
      const { error: sqlError } = await supabase.from("_direct_sql").select(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'customer_subscriptions' 
            AND column_name = 'subscription_status'
          ) THEN
            ALTER TABLE public.customer_subscriptions ADD COLUMN subscription_status TEXT;
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' 
              AND table_name = 'customer_subscriptions' 
              AND column_name = 'status'
            ) THEN
              UPDATE public.customer_subscriptions
              SET subscription_status = status;
            END IF;
          END IF;
        END $$;
      `);

      if (sqlError) {
        logDebug("Direct SQL error (this might be expected)", sqlError);
      } else {
        logDebug("Direct SQL execution successful");
      }
    }

    // Check the current schema
    const { data: tableInfo, error: tableError } = await supabase
      .from("customer_subscriptions")
      .select("*")
      .limit(1);

    if (tableError) {
      logDebug("Error checking table after update", tableError);
      return new Response(
        JSON.stringify({
          success: false,
          error: tableError.message,
          message: "Failed to verify table structure after update",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const columns =
      tableInfo && tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [];
    const hasSubscriptionStatus = columns.includes("subscription_status");

    logDebug("Table columns after update", columns);
    logDebug("Has subscription_status column:", hasSubscriptionStatus);

    // If we don't have the subscription_status column, try one last approach
    if (!hasSubscriptionStatus) {
      logDebug("Column not found, trying alternative approach");

      // Try a direct call using Postgres extension
      try {
        const { data, error } = await supabase
          .from("customer_subscriptions")
          .select("id")
          .limit(1);

        if (error) {
          logDebug("Error selecting from customer_subscriptions", error);
        } else {
          logDebug("Selected from customer_subscriptions", data);

          // Try to execute raw SQL to add the column
          const { data: pgResult, error: pgError } = await supabase.rpc(
            "pg_execute",
            {
              sql: `
            ALTER TABLE public.customer_subscriptions 
            ADD COLUMN IF NOT EXISTS subscription_status TEXT;
            
            -- Update subscription_status from status if status exists
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'customer_subscriptions' 
                AND column_name = 'status'
              ) THEN
                UPDATE public.customer_subscriptions
                SET subscription_status = status
                WHERE subscription_status IS NULL OR subscription_status = '';
              END IF;
            END $$;
            `,
            },
          );

          if (pgError) {
            logDebug("PG execute error", pgError);
          } else {
            logDebug("PG execute success", pgResult);
          }
        }
      } catch (pgExtError) {
        logDebug("PG Extension error", pgExtError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription status column check completed",
        hasSubscriptionStatus,
        columns,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logDebug("Unexpected error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Unexpected error executing fix",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
