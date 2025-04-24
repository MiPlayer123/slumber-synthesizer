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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the customer ID from the database
    const { data: customerData, error: customerError } = await supabase
      .from("customer_subscriptions")
      .select("stripe_customer_id, subscription_id, customer_portal_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerError) {
      console.error("Error fetching customer data:", customerError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve customer information" }),
        {
          status: 500,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If no customer data, return null subscription
    if (!customerData || !customerData.subscription_id) {
      return new Response(
        JSON.stringify({ subscription: null }),
        {
          status: 200,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      customerData.subscription_id
    );

    // Determine the plan name based on the price ID or product
    let planName = "";
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      
      // Fetch product details
      const product = await stripe.products.retrieve(
        subscription.items.data[0].price.product as string
      );
      
      planName = product.name || "";
    }

    // Format the response with full cancellation details
    const formattedSubscription = {
      id: subscription.id,
      status: subscription.cancel_at_period_end ? "canceling" : subscription.status,
      planName,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      customerPortalUrl: customerData.customer_portal_url || null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    };

    // Special handling for canceled subscriptions still in paid period
    let statusToStore = formattedSubscription.status;
    let cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
    
    // Ensure current_period_end is always set
    let currentPeriodEnd = null;
    if (subscription.current_period_end) {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      console.log(`Current period ends at ${currentPeriodEnd}`);
    } else {
      // If the subscription doesn't have current_period_end, try to get it from a fresh API call
      try {
        const refreshedSubscription = await stripe.subscriptions.retrieve(subscription.id);
        if (refreshedSubscription.current_period_end) {
          currentPeriodEnd = new Date(refreshedSubscription.current_period_end * 1000).toISOString();
          console.log(`Retrieved current_period_end from fresh Stripe call: ${currentPeriodEnd}`);
          
          // Update the formatted subscription object as well
          formattedSubscription.currentPeriodEnd = currentPeriodEnd;
        }
      } catch (error) {
        console.error("Failed to fetch current_period_end from Stripe:", error);
      }
    }
    
    // If subscription is canceled but paid period hasn't ended,
    // store as 'active' with cancel_at_period_end=true
    if (subscription.status === 'canceled' && 
        subscription.current_period_end && 
        subscription.current_period_end * 1000 > Date.now()) {
      statusToStore = 'canceling'; // This maps to 'active' with cancel_at_period_end in the database
      cancelAtPeriodEnd = true;
      console.log(`Setting cancelAtPeriodEnd=true for canceled subscription still in paid period until ${new Date(subscription.current_period_end * 1000).toISOString()}`);
    }

    // Update the database with the latest information
    const { error: updateError } = await supabase
      .from("customer_subscriptions")
      .update({
        subscription_status: statusToStore,
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating subscription details:", updateError);
    }

    return new Response(
      JSON.stringify({ subscription: formattedSubscription }),
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