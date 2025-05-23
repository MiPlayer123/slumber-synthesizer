import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Custom CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, x-client-info, apikey, X-Client-Info",
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
const logDebug = (message: string) => {
  // Only log the message without the potentially sensitive data
  console.log(`[GET-STRIPE-SUBSCRIPTION] ${message}`);
};

// Helper function to check if subscription has payment issues
const hasPaymentIssues = (status: string): boolean => {
  return ["past_due", "unpaid", "incomplete"].includes(status);
};

// Helper function to build standard response
const buildResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

// POST /get-stripe-subscription  { sessionId }
// ----------------------------------------------------------------
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
    return buildResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const requestData = await req.json();
    const { sessionId, userId, stripeCustomerId, subscriptionId } = requestData;

    // Handle the case where userId and stripeCustomerId are provided instead of sessionId
    if (userId && stripeCustomerId) {
      logDebug(
        `Processing with userId=${userId} and stripeCustomerId=${stripeCustomerId}`,
      );

      try {
        // Get customer's subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 1,
        });

        if (!subscriptions.data.length) {
          logDebug(`No subscriptions found for customer ${stripeCustomerId}`);
          return buildResponse({
            error: "No subscriptions found for this customer",
            success: false,
            payment_failed: false,
          });
        }

        // Use the most recent subscription
        const sub = subscriptions.data[0];
        logDebug(`Found subscription: ${sub.id} with status ${sub.status}`);

        // Check if subscription has payment issues
        const paymentFailed = hasPaymentIssues(sub.status);
        if (paymentFailed) {
          logDebug(`Subscription has payment issues: status=${sub.status}`);
        }

        // Create portal URL for subscription management
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${Deno.env.get("SITE_URL")}/settings?tab=subscription`,
        });

        // Build the row for database update
        const row = {
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          subscription_id: sub.id,
          status: sub.status === "active" ? "active" : sub.status,
          subscription_status: sub.status === "active" ? "active" : sub.status,
          customer_portal_url: portalSession.url,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          canceled_at: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : null,
          current_period_end: new Date(
            sub.current_period_end * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        };

        logDebug(`Updating subscription data for user ${userId}`);

        // Update the subscription record
        const { error } = await supabase
          .from("customer_subscriptions")
          .update(row)
          .eq("user_id", userId);

        if (error) {
          logDebug(`Database update error: ${error.message}`);

          // Try with simpler data if the update fails
          const simpleRow = {
            subscription_id: sub.id,
            status: sub.status === "active" ? "active" : sub.status,
            subscription_status:
              sub.status === "active" ? "active" : sub.status,
            updated_at: new Date().toISOString(),
          };

          const { error: fallbackError } = await supabase
            .from("customer_subscriptions")
            .update(simpleRow)
            .eq("user_id", userId);

          if (fallbackError) {
            logDebug(`Fallback update also failed: ${fallbackError.message}`);
          } else {
            logDebug(`Database updated with basic subscription details`);
          }
        } else {
          logDebug(`Successfully updated subscription data`);
        }

        return buildResponse({
          success: true,
          subscription_id: sub.id,
          status: sub.status,
          payment_failed: paymentFailed,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: sub.current_period_end,
        });
      } catch (stripeError) {
        logDebug(`Stripe error: ${stripeError.message}`);
        return buildResponse(
          {
            error: stripeError.message,
            success: false,
            payment_failed: false,
          },
          500,
        );
      }
    }
    // Handle direct subscriptionId case
    else if (subscriptionId) {
      logDebug(`Processing with direct subscriptionId=${subscriptionId}`);

      try {
        // Get subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        logDebug(`Retrieved subscription: status=${sub.status}`);

        // Check payment status
        const paymentFailed = hasPaymentIssues(sub.status);
        if (paymentFailed) {
          logDebug(`Subscription has payment issues: status=${sub.status}`);
        }

        return buildResponse({
          success: true,
          subscription_id: sub.id,
          status: sub.status,
          payment_failed: paymentFailed,
          customer_id: sub.customer,
        });
      } catch (subError) {
        logDebug(`Error retrieving subscription: ${subError.message}`);
        return buildResponse(
          {
            error: subError.message,
            success: false,
            payment_failed: false,
          },
          500,
        );
      }
    }
    // Original sessionId flow
    else if (sessionId) {
      logDebug(`Processing sessionId: ${sessionId}`);

      // 1️⃣  Pull the finished checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer", "subscription"],
      });

      // Check for payment failures
      let paymentFailed = false;
      if (
        session.payment_status === "unpaid" ||
        session.status === "expired" ||
        session.payment_status === "no_payment_required"
      ) {
        logDebug(
          `Detected possible payment issue: payment_status=${session.payment_status}, status=${session.status}`,
        );
        paymentFailed = true;
      }

      // Get the subscription object
      let sub;
      if (session.subscription) {
        if (typeof session.subscription === "string") {
          sub = await stripe.subscriptions.retrieve(session.subscription);
        } else {
          sub = session.subscription;
        }

        // Check if subscription has payment issues
        if (
          sub.status === "past_due" ||
          sub.status === "unpaid" ||
          sub.status === "incomplete"
        ) {
          logDebug(`Subscription has payment issues: status=${sub.status}`);
          paymentFailed = true;
        }
      }

      // Check subscription status
      if (paymentFailed) {
        logDebug(`Subscription has payment issues: status=${sub.status}`);

        // Payment specific error handling
        logDebug(
          `Payment failed and no active subscription found for session ${sessionId}`,
        );
        return buildResponse({
          error: "Payment failed or subscription inactive",
          payment_failed: true,
          success: false,
        });
      }

      // If no subscription found at all or inactive (and not due to payment failure)
      if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
        logDebug(`No active subscription found for session ${sessionId}`);
        return buildResponse({
          error: "No active subscription found for this session",
          success: false,
          payment_failed: false,
        });
      }

      logDebug(`Found active subscription: ${sub.id}`);

      // 2️⃣  Figure out who the user is from metadata
      const userId = session.metadata?.user_id;
      if (!userId) {
        logDebug(`user_id missing from session metadata`);
        return buildResponse(
          {
            error: "user_id missing from session metadata",
            success: false,
            payment_failed: false,
          },
          400,
        );
      }

      logDebug(`Processing for user: ${userId}`);

      // 3️⃣  Build the row *only with columns that exist*
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

      // Create portal URL for subscription management
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${Deno.env.get("SITE_URL")}/settings?tab=subscription`,
      });

      // Build the row for database insert/update
      const row = {
        user_id: userId,
        stripe_customer_id: customerId,
        subscription_id: sub.id,
        status: paymentFailed ? "past_due" : "active",
        subscription_status: paymentFailed ? "past_due" : "active",
        customer_portal_url: portalSession.url,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        canceled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        current_period_end: new Date(
          sub.current_period_end * 1000,
        ).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      logDebug(`Upserting subscription data for user ${userId}`);

      // 4️⃣  UPSERT (insert on first time, update thereafter)
      const { error } = await supabase
        .from("customer_subscriptions")
        .upsert(row, { onConflict: "user_id" });

      if (error) {
        logDebug(`Database error: ${error.message}`);

        // Try a simpler row with only the essential columns if the first one fails
        const simpleRow = {
          user_id: userId,
          subscription_id: sub.id,
          status: paymentFailed ? "past_due" : "active",
          subscription_status: paymentFailed ? "past_due" : "active",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        const { error: fallbackError } = await supabase
          .from("customer_subscriptions")
          .upsert(simpleRow, { onConflict: "user_id" });

        if (fallbackError) {
          logDebug(`Fallback upsert also failed: ${fallbackError.message}`);
          return buildResponse(
            {
              error: fallbackError.message,
              payment_failed: paymentFailed,
              success: false,
            },
            500,
          );
        } else {
          logDebug(`Database updated with basic subscription details`);
        }
      } else {
        logDebug(`Successfully upserted subscription data`);
      }

      return buildResponse({
        success: true,
        subscription_id: sub.id,
        status: sub.status,
        payment_failed: paymentFailed,
      });
    }
    // No valid parameters provided
    else {
      return buildResponse(
        {
          error:
            "No valid parameters provided. Please provide either sessionId, userId+stripeCustomerId, or subscriptionId",
          success: false,
          payment_failed: false,
        },
        400,
      );
    }
  } catch (err) {
    logDebug(`Error: ${err.message}`);
    return buildResponse(
      {
        error: err.message,
        success: false,
        payment_failed: false,
      },
      500,
    );
  }
});
