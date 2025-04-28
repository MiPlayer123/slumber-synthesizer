import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Get environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to log debug messages
const logDebug = (message: string, data?: any) => {
  console.log(
    `[subscription-cron] ${message}`,
    data ? JSON.stringify(data) : "",
  );
};

/**
 * Scheduled function to process subscription expirations.
 * This function checks for subscriptions that:
 * 1. Are in "canceling" status
 * 2. Have reached their current_period_end date
 *
 * And updates them to "canceled" status.
 */
serve(async () => {
  try {
    const now = new Date();
    logDebug(`Running scheduled subscription check at ${now.toISOString()}`);

    // Get all subscriptions that are in "canceling" state and have period_end in the past
    const { data: expiredSubscriptions, error: queryError } = await supabase
      .from("customer_subscriptions")
      .select(
        "id, user_id, subscription_id, subscription_status, current_period_end, cancel_at_period_end",
      )
      .or(
        `subscription_status.eq.canceling,and(subscription_status.eq.active,cancel_at_period_end.eq.true)`,
      )
      .lt("current_period_end", now.toISOString());

    if (queryError) {
      logDebug("Error querying expired subscriptions", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to query expired subscriptions" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    logDebug(
      `Found ${expiredSubscriptions.length} expired subscriptions to process`,
    );

    // Process each expired subscription
    const results = await Promise.all(
      expiredSubscriptions.map(async (subscription) => {
        logDebug(
          `Processing expired subscription for user ${subscription.user_id}`,
        );

        // Update the subscription status to "canceled"
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            status: "canceled",
            subscription_status: "canceled",
            subscription_id: null,
            canceled_at: now.toISOString(),
            updated_at: now.toISOString(),
            cancel_at_period_end: false,
          })
          .eq("id", subscription.id);

        if (updateError) {
          logDebug(
            `Error updating subscription ${subscription.id}`,
            updateError,
          );
          return { id: subscription.id, success: false, error: updateError };
        } else {
          logDebug(
            `Successfully transitioned subscription ${subscription.id} to canceled status`,
          );
          return { id: subscription.id, success: true };
        }
      }),
    );

    // Return the results
    return new Response(
      JSON.stringify({
        processed: expiredSubscriptions.length,
        successes: results.filter((r) => r.success).length,
        failures: results.filter((r) => !r.success).length,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logDebug("Unhandled error in subscription cron", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
