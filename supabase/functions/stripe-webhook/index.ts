import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Function to log debug information
const logDebug = (message: string, data?: any) => {
  console.log(`[STRIPE WEBHOOK] ${message}`, data ? JSON.stringify(data) : '');
};

// Initialize clients with environment variables
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, stripe-signature, x-client-info",
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

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Stripe signature missing", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get the raw request body
    const body = await req.text();
    
    // Verify the webhook signature
    logDebug("Verifying webhook signature");
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    logDebug(`Event received: ${event.type}`, event.data.object);
    
    // Process specific event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        logDebug("Processing checkout session completion", session);
        
        const customerId = session.customer as string;
        // Extract the subscription ID from the session
        const subscriptionId = session.subscription as string;
        
        if (!subscriptionId) {
          logDebug("No subscription ID in checkout session, skipping");
          break;
        }
        
        // Get the Stripe subscription to check its status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Find the customer record in our database
        const { data: customerData, error: customerError } = await supabase
          .from("customer_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (customerError || !customerData) {
          logDebug("Error finding customer", customerError || "No customer found");
          break;
        }
        
        // Create a customer portal URL for managing the subscription
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId as string,
          return_url: `${Deno.env.get("SITE_URL") || 'http://localhost:8080'}/settings?tab=subscription`,
        });
        logDebug("Created portal session", portalSession);
        
        // Update the customer_subscriptions table
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_id: subscriptionId,
            subscription_status: subscription.status,
            customer_portal_url: portalSession.url,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          logDebug("Error updating subscription record", updateError);
        } else {
          logDebug("Successfully updated subscription record");
        }
        
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        logDebug("Processing subscription update", subscription);
        
        const customerId = subscription.customer;
        
        // Update the subscription status in our database
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          logDebug("Error updating subscription status", updateError);
        } else {
          logDebug("Successfully updated subscription status");
        }
        
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        logDebug("Processing subscription deletion", subscription);
        
        const customerId = subscription.customer;
        
        // Mark the subscription as canceled in our database
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_status: "canceled",
            subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          logDebug("Error updating subscription status for deletion", updateError);
        } else {
          logDebug("Successfully updated subscription status for deletion");
        }
        
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        logDebug("Processing successful payment", invoice);
        
        // Only process subscription invoices
        if (!invoice.subscription) {
          logDebug("Not a subscription invoice, skipping");
          break;
        }
        
        // Update the subscription status to active
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("subscription_id", invoice.subscription);
        
        if (updateError) {
          logDebug("Error updating subscription status after payment", updateError);
        } else {
          logDebug("Successfully updated subscription status after payment");
        }
        
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        logDebug("Processing failed payment", invoice);
        
        // Only process subscription invoices
        if (!invoice.subscription) {
          logDebug("Not a subscription invoice, skipping");
          break;
        }
        
        // Update the subscription status to reflect payment failure
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("subscription_id", invoice.subscription);
        
        if (updateError) {
          logDebug("Error updating subscription status after payment failure", updateError);
        } else {
          logDebug("Successfully updated subscription status after payment failure");
        }
        
        break;
      }
      
      default:
        logDebug(`Unhandled event type: ${event.type}`);
    }
    
    // Return a success response to Stripe
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logDebug(`Error processing webhook: ${err.message}`, err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 