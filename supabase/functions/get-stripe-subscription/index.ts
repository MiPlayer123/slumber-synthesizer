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
    
    // Log the subscription ID we're about to store
    console.log(`Retrieved subscription from Stripe: ID=${subscription.id}, status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}`);
    
    // Set the proper subscription status based on cancel_at_period_end
    const subscriptionStatus = subscription.cancel_at_period_end ? "canceling" : subscription.status;
    
    // Update the subscription data in the database with all cancellation info
    console.log(`Updating subscription_id in database to: ${subscription.id}, status: ${subscriptionStatus}`);
    
    try {
      // Try updating with all fields first
      const { error: updateError } = await supabase
        .from("customer_subscriptions")
        .update({
          subscription_id: subscription.id,
          subscription_status: subscriptionStatus,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
  
      if (updateError) {
        console.error("Error updating subscription details:", updateError);
        
        // Check if error is due to missing columns
        if (updateError.message && (
            updateError.message.includes("cancel_at_period_end") ||
            updateError.message.includes("canceled_at") ||
            updateError.message.includes("current_period_end")
          )) {
          console.log("Missing cancellation columns, trying update with just status and subscription_id");
          
          // Fall back to just updating the status and subscription_id
          const { error: fallbackError } = await supabase
            .from("customer_subscriptions")
            .update({
              subscription_id: subscription.id,
              subscription_status: subscriptionStatus,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);
            
          if (fallbackError) {
            console.error("Error with fallback update too:", fallbackError);
          } else {
            console.log(`Successfully updated just the subscription_id and status to: ${subscription.id}, ${subscriptionStatus}`);
          }
        }
        
        // Try to get details about the current record to help debugging
        const { data: currentData, error: fetchError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, subscription_status")
          .eq("user_id", userId)
          .single();
          
        if (fetchError) {
          console.error("Could not fetch current subscription state for diagnostics:", fetchError);
        } else {
          console.log(`Current record state: subscription_id=${currentData.subscription_id || 'NULL'}, status=${currentData.subscription_status || 'NULL'}`);
        }
      } else {
        console.log(`Successfully updated subscription_id to ${subscription.id} in database`);
        
        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
          .from("customer_subscriptions")
          .select("subscription_id, subscription_status")
          .eq("user_id", userId)
          .single();
          
        if (verifyError) {
          console.error("Error verifying subscription update:", verifyError);
        } else {
          console.log(`Verified database update, subscription_id is now: ${verifyData.subscription_id || 'NULL'}`);
        }
      }
    } catch (error) {
      console.error("Unexpected error updating subscription:", error);
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