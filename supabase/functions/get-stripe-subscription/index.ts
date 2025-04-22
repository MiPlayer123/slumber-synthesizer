import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Custom CORS headers to ensure all origins work
const customCorsHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Origin": "*", // Allow all origins
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-Client-Info, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: customCorsHeaders });
  }

  try {
    const { userId, stripeCustomerId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we don't have a customer ID, try to look it up
    let customerId = stripeCustomerId;
    if (!customerId) {
      const { data: customerData, error: customerError } = await supabase
        .from("customer_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (customerError || !customerData?.stripe_customer_id) {
        return new Response(
          JSON.stringify({ error: "Customer not found" }),
          {
            status: 404,
            headers: { ...customCorsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      customerId = customerData.stripe_customer_id;
    }

    // Fetch the customer's subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
      limit: 100, // Get all subscriptions for this customer
    });

    if (!subscriptions || subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subscriptions found for this customer" }),
        {
          status: 404,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get active subscription first, or the most recent one
    const sortedSubscriptions = subscriptions.data.sort((a, b) => {
      // Sort by active status first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      
      // Then sort by creation date (most recent first)
      return b.created - a.created;
    });

    const subscription = sortedSubscriptions[0];
    
    // Update the subscription data in the database with all cancellation info
    const { error: updateError } = await supabase
      .from("customer_subscriptions")
      .update({
        subscription_id: subscription.id,
        subscription_status: subscription.cancel_at_period_end ? "canceling" : subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating subscription details:", updateError);
    }

    // Return subscription details with full cancellation info
    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        status: subscription.cancel_at_period_end ? "canceling" : subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
      }),
      {
        status: 200,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}); 