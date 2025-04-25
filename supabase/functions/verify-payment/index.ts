import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Custom CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info",
};

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

// Debug logger
const logDebug = (message: string, data?: any) => {
  console.log(`[VERIFY PAYMENT] ${message}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, sessionId } = await req.json();

    // Validate required parameters
    if (!userId) {
      logDebug("Missing userId parameter");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!sessionId) {
      logDebug("Missing sessionId parameter");
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logDebug(`Verifying Stripe session ${sessionId} for user ${userId}`);

    try {
      // 1. Retrieve the Checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });

      logDebug(`Retrieved session`, {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        customer: session.customer,
        subscription: session.subscription ? (typeof session.subscription === 'string' ? session.subscription : session.subscription.id) : null,
      });

      // 2. Check if the payment was successful
      let verified = false;
      let paid = false;
      let subscriptionId = null;

      if (session.payment_status === "paid") {
        paid = true;
        logDebug(`Payment verified as paid`);
      }

      // For subscription payments, also check that a subscription was created
      if (session.mode === "subscription") {
        // First try to get the subscription ID from the session directly
        if (session.subscription) {
          subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          
          logDebug(`Found subscription ID: ${subscriptionId}`);
            
          // Now fetch the subscription details to check status
          try {
            const subscription = typeof session.subscription === 'string'
              ? await stripe.subscriptions.retrieve(session.subscription)
              : session.subscription;
            
            logDebug(`Retrieved subscription details: status=${subscription.status}`);
            
            if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
              verified = true;
              paid = true;
              logDebug(`Subscription verified as ${subscription.status}`);
              
              // Update the database record with the verified subscription information
              if (verified && subscriptionId) {
                logDebug("[verify-payment] Payment verified—updating database");
                
                // Determine current_period_end date from subscription data
                const current_period_end = new Date(
                  (typeof session.subscription === "object"
                    ? session.subscription.current_period_end!
                    : (await stripe.subscriptions.retrieve(session.subscription as string))
                        .current_period_end)! *
                    1000
                ).toISOString();
                
                // Build the row with only columns that exist in our table
                const row = {
                  user_id: userId,
                  subscription_id: subscriptionId,
                  subscription_status: "active",
                  current_period_end: current_period_end,
                  stripe_customer_id: session.customer as string,
                  updated_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                };
                
                // Use upsert instead of update to handle both new and existing rows
                const { data, error } = await supabase
                  .from("customer_subscriptions")
                  .upsert(row, { onConflict: "user_id" });
                
                if (error) {
                  logDebug(`Error upserting subscription record: ${error.message}`, error);
                  
                  // Try a simpler row with only the essential columns if the first one fails
                  const simpleRow = {
                    user_id: userId,
                    subscription_id: subscriptionId,
                    subscription_status: "active",
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  };
                  
                  const { error: fallbackError } = await supabase
                    .from("customer_subscriptions")
                    .upsert(simpleRow, { onConflict: "user_id" });
                    
                  if (fallbackError) {
                    logDebug(`Fallback upsert also failed: ${fallbackError.message}`, fallbackError);
                  } else {
                    logDebug("[verify-payment] Database updated with basic subscription details");
                  }
                } else {
                  logDebug("[verify-payment] Database should now reflect active subscription");
                }
              }
            }
          } catch (subscriptionError) {
            logDebug(`Error retrieving subscription: ${subscriptionError.message}`);
          }
        }
      } else if (session.mode === "payment" && session.payment_status === "paid") {
        // For one-time payments
        verified = true;
        logDebug("One-time payment verified as paid");
      }

      // 3. Ensure the checkout session belongs to this user
      try {
        const { data: customerData, error: customerError } = await supabase
          .from("customer_subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (customerError) {
          logDebug(`Error fetching customer data: ${customerError.message}`);
        } else if (customerData?.stripe_customer_id) {
          logDebug(`Found customer ID in database: ${customerData.stripe_customer_id}`);
          
          // Check that the session's customer matches our records
          if (session.customer && customerData.stripe_customer_id !== session.customer) {
            logDebug(`Customer mismatch: ${customerData.stripe_customer_id} vs ${session.customer}`);
            // This is a mismatch, but we'll still return the data and just set verified to false
            verified = false;
          } else {
            logDebug(`Customer ID match confirmed`);
          }
        } else if (session.customer) {
          // If we don't have a record yet, but got a customer ID from the session, 
          // we should create a record
          logDebug(`No existing customer record found. Creating new record with customer ID ${session.customer}`);
          
          try {
            const { error: insertError } = await supabase
              .from("customer_subscriptions")
              .insert({
                user_id: userId,
                stripe_customer_id: session.customer,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              logDebug(`Error creating customer record: ${insertError.message}`);
            } else {
              logDebug(`Successfully created customer record`);
            }
          } catch (dbError) {
            logDebug(`Database error: ${dbError.message}`);
          }
        }
      } catch (dbError) {
        logDebug(`Database error checking customer: ${dbError.message}`);
      }

      // 4. Return the verification result
      return new Response(
        JSON.stringify({
          verified,
          paid,
          subscriptionId,
          status: session.status,
          payment_status: session.payment_status,
          customer: session.customer,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (stripeError) {
      // Handle specific Stripe errors
      logDebug(`Stripe error: ${stripeError.message}`);
      
      // Return a more specific error for invalid session IDs
      if (stripeError.message.includes("No such checkout.session")) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid session ID", 
            verified: false, 
            paid: false,
            subscriptionId: null
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Return generic error for other Stripe issues
      return new Response(
        JSON.stringify({ 
          error: stripeError.message,
          verified: false,
          paid: false,
          subscriptionId: null
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    logDebug(`Error verifying payment: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        verified: false,
        paid: false,
        subscriptionId: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}); 