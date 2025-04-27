import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Function to log debug information
const logDebug = (message: string, data?: any) => {
  console.log(`[STRIPE WEBHOOK] ${message}`, data ? JSON.stringify(data) : "");
};

// Utility function to log with consistent formatting
const logInfo = (message: string, data?: any) => {
  // Don't log potentially sensitive data
  console.log(`[STRIPE WEBHOOK] ${message}`);
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
  "Access-Control-Allow-Headers":
    "content-type, authorization, x-client-info, apikey, X-Client-Info",
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
    logInfo("Verifying webhook signature");
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    logInfo(`Event received: ${event.type}`);

    // Process specific event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        logInfo("Processing checkout session completion");

        const customerId = session.customer as string;
        // Extract the subscription ID from the session
        const subscriptionId = session.subscription as string;
        let userId =
          session.metadata?.user_id ||
          (session.subscription_data?.metadata?.user_id as string);

        if (!subscriptionId) {
          logDebug("No subscription ID in checkout session, skipping");
          break;
        }

        if (!customerId) {
          logDebug("No customer ID in checkout session, skipping");
          break;
        }

        if (!userId) {
          logDebug(
            "No user ID in checkout session metadata, trying to find from customer metadata",
          );
          // Try to get the user ID from the customer metadata
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.metadata?.user_id) {
              logDebug(
                `Found user_id ${customer.metadata.user_id} in customer metadata`,
              );
              userId = customer.metadata.user_id;
            } else {
              logDebug("Could not find user ID in customer metadata");
              break;
            }
          } catch (error) {
            logDebug(`Error fetching customer: ${error.message}`);
            break;
          }
        }

        // Get the Stripe subscription to check its status
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        logInfo(
          `Retrieved Stripe subscription details with status=${subscription.status}`,
        );

        // Find the customer record in our database
        const { data: customerData, error: customerError } = await supabase
          .from("customer_subscriptions")
          .select("user_id, subscription_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        // Create a customer portal URL for managing the subscription
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId as string,
          return_url: `${Deno.env.get("SITE_URL")}/settings?tab=subscription`,
        });
        logInfo("Created portal session");

        // If no customer record exists, create one
        if (customerError || !customerData) {
          logDebug("Customer record not found, creating new record");

          if (!userId) {
            logDebug("Cannot create subscription record without user_id");
            break;
          }

          // Insert a new subscription record
          const { error: insertError } = await supabase
            .from("customer_subscriptions")
            .insert({
              user_id: userId,
              subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: "active",
              subscription_status: "active",
              customer_portal_url: portalSession.url,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
              current_period_end: new Date(
                subscription.current_period_end! * 1000,
              ).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            logDebug("Error creating subscription record", insertError);
          } else {
            logDebug(
              `Successfully created subscription record with subscription_id=${subscriptionId}`,
            );
          }

          break;
        }

        logInfo("Found existing subscription record in database");

        // Update the customer_subscriptions table
        logInfo("Updating subscription record in database");

        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: "active",
            subscription_status: "active",
            customer_portal_url: portalSession.url,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            current_period_end: new Date(
              subscription.current_period_end! * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          logDebug("Error updating subscription record", updateError);
        } else {
          logDebug(
            `Successfully updated subscription record with subscription_id=${subscriptionId}`,
          );

          // Verify the update by selecting the record again
          const { data: verifyData, error: verifyError } = await supabase
            .from("customer_subscriptions")
            .select("subscription_id, status")
            .eq("stripe_customer_id", customerId)
            .single();

          if (verifyError) {
            logDebug("Error verifying update", verifyError);
          } else {
            logDebug(
              `Verified database update, subscription_id is now: ${verifyData.subscription_id || "NULL"}, status: ${verifyData.status}`,
            );
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        logDebug("Processing subscription update", subscription);

        const customerId = subscription.customer;

        // Log subscription update details clearly
        logDebug(
          `Updating subscription: customer=${customerId}, status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}`,
        );

        // Special handling for cancellations - if status is 'canceled' but period has not ended
        // we should keep status as 'active' but set cancel_at_period_end=true
        let statusToStore = subscription.status;
        let cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

        // Make sure we always have the current_period_end value even if not provided
        let currentPeriodEnd = null;
        if (subscription.current_period_end) {
          currentPeriodEnd = new Date(
            subscription.current_period_end * 1000,
          ).toISOString();
          logDebug(`Current period ends at ${currentPeriodEnd}`);
        } else {
          // If current_period_end is missing, try to fetch it directly from Stripe
          try {
            const subscriptionDetails = await stripe.subscriptions.retrieve(
              subscription.id,
            );
            if (subscriptionDetails.current_period_end) {
              currentPeriodEnd = new Date(
                subscriptionDetails.current_period_end * 1000,
              ).toISOString();
              logDebug(
                `Retrieved current_period_end from Stripe: ${currentPeriodEnd}`,
              );
            } else {
              logDebug(
                "Could not determine current_period_end, even after fetching from Stripe",
              );
            }
          } catch (error) {
            logDebug(
              `Error fetching subscription details from Stripe: ${error.message}`,
            );
          }
        }

        if (
          subscription.status === "canceled" &&
          subscription.current_period_end &&
          subscription.current_period_end * 1000 > Date.now()
        ) {
          // This is a canceled subscription still in paid period
          statusToStore = "active";
          cancelAtPeriodEnd = true;
          logDebug(
            `Treating canceled subscription as active with cancel_at_period_end=true until period ends at ${new Date(subscription.current_period_end * 1000).toISOString()}`,
          );
        }

        // Try to update with all fields first
        try {
          const { error: updateError } = await supabase
            .from("customer_subscriptions")
            .update({
              status: statusToStore,
              cancel_at_period_end: cancelAtPeriodEnd,
              current_period_end: currentPeriodEnd,
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          if (updateError) {
            logDebug("Error updating subscription status", updateError);

            // Check if error is due to missing columns
            if (
              updateError.message &&
              (updateError.message.includes("cancel_at_period_end") ||
                updateError.message.includes("canceled_at") ||
                updateError.message.includes("current_period_end"))
            ) {
              logDebug(
                "Missing cancellation columns, trying update with just status",
              );

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
                logDebug(
                  `Successfully updated just the subscription status to: ${subscription.status}`,
                );
              }
            }
          } else {
            logDebug(
              `Successfully updated subscription status to: ${subscription.status}`,
            );
            logDebug(
              `Cancel at period end: ${subscription.cancel_at_period_end ? "Yes" : "No"}`,
            );
            if (subscription.current_period_end) {
              logDebug(
                `Current period ends: ${new Date(subscription.current_period_end * 1000).toISOString()}`,
              );
            }

            // Verify the update by selecting the record again
            const { data: verifyData, error: verifyError } = await supabase
              .from("customer_subscriptions")
              .select("subscription_id, status, cancel_at_period_end")
              .eq("stripe_customer_id", customerId)
              .single();

            if (verifyError) {
              logDebug(
                "Error verifying subscription status update",
                verifyError,
              );
            } else {
              logDebug(
                `Verified database update, status is now: ${verifyData.status || "NULL"}, cancel_at_period_end: ${verifyData.cancel_at_period_end ? "true" : "false"}`,
              );
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
            status: "canceled",
            subscription_status: "canceled",
            subscription_id: null,
            cancel_at_period_end: false,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          logDebug(
            "Error updating subscription status for deletion",
            updateError,
          );
        } else {
          logDebug("Successfully updated subscription status for deletion");
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
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
        );

        // Update the subscription status
        const { error: updateError } = await supabase
          .from("customer_subscriptions")
          .update({
            status: subscription.status,
            subscription_status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("subscription_id", invoice.subscription);

        if (updateError) {
          logDebug(
            "Error updating subscription status after payment failure",
            updateError,
          );
        } else {
          logDebug(
            "Successfully updated subscription status after payment failure",
          );
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        logDebug("Processing successful payment", invoice);

        // Only process subscription invoices
        if (!invoice.subscription) {
          logDebug("Not a subscription invoice, skipping");
          break;
        }

        // Need to fetch the subscription to get its status and details
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
        );
        logDebug("Retrieved subscription details", {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        // For recurring subscription payments, we need to ensure subscription is marked as active
        if (subscription.status === "active") {
          // Find the customer record in our database
          const { data: customerData, error: customerError } = await supabase
            .from("customer_subscriptions")
            .select("user_id, subscription_id, status")
            .eq("stripe_customer_id", subscription.customer)
            .maybeSingle();

          if (customerError || !customerData) {
            logDebug(
              "Error finding customer",
              customerError || "No customer found",
            );
            break;
          }

          // Check if we need to update the subscription status
          if (
            !customerData.subscription_id ||
            customerData.status !== "active"
          ) {
            logDebug(`Updating subscription status to active after payment`, {
              previous_status: customerData.status || "null",
              previous_subscription_id: customerData.subscription_id || "null",
            });

            // Update the subscription record
            const { error: updateError } = await supabase
              .from("customer_subscriptions")
              .update({
                status: "active",
                subscription_status: "active",
                subscription_id: subscription.id,
                stripe_customer_id: subscription.customer,
                cancel_at_period_end:
                  subscription.cancel_at_period_end || false,
                canceled_at: subscription.canceled_at
                  ? new Date(subscription.canceled_at * 1000).toISOString()
                  : null,
                current_period_end: new Date(
                  subscription.current_period_end * 1000,
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", subscription.customer);

            if (updateError) {
              logDebug(
                "Error updating subscription status after payment",
                updateError,
              );

              // Try updating with just the basic fields if the above fails
              const { error: fallbackError } = await supabase
                .from("customer_subscriptions")
                .update({
                  status: "active",
                  subscription_status: "active",
                  subscription_id: subscription.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_customer_id", subscription.customer);

              if (fallbackError) {
                logDebug(
                  "Error with fallback update after payment",
                  fallbackError,
                );
              } else {
                logDebug(
                  "Successfully updated basic subscription info after payment",
                );
              }
            } else {
              logDebug(
                "Successfully updated subscription status after payment",
              );
            }
          } else {
            logDebug(
              "Subscription already active and up-to-date, no database update needed",
            );
          }
        } else {
          logDebug(
            `Not updating subscription because status is: ${subscription.status}`,
          );
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
