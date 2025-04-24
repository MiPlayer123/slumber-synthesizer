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
        logDebug(`Retrieved Stripe subscription details: ID=${subscriptionId}, status=${subscription.status}`);
        
        // Find the customer record in our database
        const { data: customerData, error: customerError } = await supabase
          .from("customer_subscriptions")
          .select("user_id, subscription_id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (customerError || !customerData) {
          logDebug("Error finding customer", customerError || "No customer found");
          break;
        }
        
        // Log the current subscription_id in the database
        logDebug(`Current subscription_id in database: ${customerData.subscription_id || 'NULL'}`);
        
        // Create a customer portal URL for managing the subscription
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId as string,
          return_url: `${Deno.env.get("SITE_URL") || 'http://localhost:8080'}/settings?tab=subscription`,
        });
        logDebug("Created portal session", portalSession);
        
        // Update the customer_subscriptions table
        logDebug(`About to update database with subscription_id=${subscriptionId}`);
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_id: subscriptionId,
            status: subscription.status,
            customer_portal_url: portalSession.url,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          logDebug("Error updating subscription record", updateError);
        } else {
          logDebug(`Successfully updated subscription record with subscription_id=${subscriptionId}`);
          
          // Verify the update by selecting the record again
          const { data: verifyData, error: verifyError } = await supabase
            .from("customer_subscriptions")
            .select("subscription_id")
            .eq("stripe_customer_id", customerId)
            .single();
            
          if (verifyError) {
            logDebug("Error verifying update", verifyError);
          } else {
            logDebug(`Verified database update, subscription_id is now: ${verifyData.subscription_id || 'NULL'}`);
          }
        }
        
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        logDebug("Processing subscription update", subscription);
        
        const customerId = subscription.customer;
        
        // Log subscription update details clearly
        logDebug(`Updating subscription: customer=${customerId}, status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}`);
        
        // Special handling for cancellations - if status is 'canceled' but period has not ended
        // we should keep status as 'active' but set cancel_at_period_end=true
        let statusToStore = subscription.status;
        let cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        
        // Make sure we always have the current_period_end value even if not provided
        let currentPeriodEnd = null;
        if (subscription.current_period_end) {
          currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          logDebug(`Current period ends at ${currentPeriodEnd}`);
        } else {
          // If current_period_end is missing, try to fetch it directly from Stripe
          try {
            const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id);
            if (subscriptionDetails.current_period_end) {
              currentPeriodEnd = new Date(subscriptionDetails.current_period_end * 1000).toISOString();
              logDebug(`Retrieved current_period_end from Stripe: ${currentPeriodEnd}`);
            } else {
              logDebug('Could not determine current_period_end, even after fetching from Stripe');
            }
          } catch (error) {
            logDebug(`Error fetching subscription details from Stripe: ${error.message}`);
          }
        }
        
        if (subscription.status === 'canceled' && 
            subscription.current_period_end && 
            subscription.current_period_end * 1000 > Date.now()) {
          // This is a canceled subscription still in paid period
          statusToStore = 'active';
          cancelAtPeriodEnd = true;
          logDebug(`Treating canceled subscription as active with cancel_at_period_end=true until period ends at ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        }
        
        // Try to update with all fields first
        try {
          const { error: updateError } = await supabase
            .from("customer_subscriptions")
            .update({
              status: statusToStore,
              updated_at: new Date().toISOString(),
              // Additional metadata to be stored about cancellation
              cancel_at_period_end: cancelAtPeriodEnd,
              canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              current_period_end: currentPeriodEnd
            })
            .eq("stripe_customer_id", customerId);
          
          if (updateError) {
            logDebug("Error updating subscription status", updateError);
            
            // Check if error is due to missing columns
            if (updateError.message && (
                updateError.message.includes("cancel_at_period_end") ||
                updateError.message.includes("canceled_at") ||
                updateError.message.includes("current_period_end")
              )) {
              logDebug("Missing cancellation columns, trying update with just status");
              
              // Fall back to just updating the status
              const { error: fallbackError } = await supabase
                .from("customer_subscriptions")
                .update({
                  status: subscription.status,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_customer_id", customerId);
                
              if (fallbackError) {
                logDebug("Error with fallback update too", fallbackError);
              } else {
                logDebug(`Successfully updated just the subscription status to: ${subscription.status}`);
              }
            }
          } else {
            logDebug(`Successfully updated subscription status to: ${subscription.status}`);
            logDebug(`Cancel at period end: ${subscription.cancel_at_period_end ? "Yes" : "No"}`);
            if (subscription.current_period_end) {
              logDebug(`Current period ends: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
            }
            
            // Verify the update by selecting the record again
            const { data: verifyData, error: verifyError } = await supabase
              .from("customer_subscriptions")
              .select("subscription_id, status, cancel_at_period_end")
              .eq("stripe_customer_id", customerId)
              .single();
              
            if (verifyError) {
              logDebug("Error verifying subscription status update", verifyError);
            } else {
              logDebug(`Verified database update, status is now: ${verifyData.status || 'NULL'}, cancel_at_period_end: ${verifyData.cancel_at_period_end ? 'true' : 'false'}`);
            }
          }
        } catch (error) {
          logDebug("Unexpected error updating subscription", error);
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
            status: subscription.status,
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
        
        // Need to fetch the subscription to get its status
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        
        // Update the subscription status
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            status: subscription.status,
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
        
        // Need to fetch the subscription to get its status
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        
        // Update the subscription status
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            status: subscription.status,
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