import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// ---------- ENV VALIDATION ----------
const required = (key: string) => {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`${key} is not set in Function secrets`);
  return v;
};

const SUPABASE_URL            = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE   = required("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY       = required("STRIPE_SECRET_KEY");
const SITE_URL                = Deno.env.get("SITE_URL") || "http://localhost:5173";
const STRIPE_MONTHLY_PRICE_ID = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
const STRIPE_SIX_PRICE_ID     = Deno.env.get("STRIPE_SIXMONTH_PRICE_ID");

// ---------- CLIENTS ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe   = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

// ---------- PRICE MAP ----------
const priceMap: Record<string, string | undefined> = {
  monthly : STRIPE_MONTHLY_PRICE_ID,
  "6-month": STRIPE_SIX_PRICE_ID,
};

// Custom CORS headers to ensure all origins work
const customCorsHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Origin": "*", // Allow all origins
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-Client-Info, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// ---------- HANDLER ----------
serve(async (req) => {
  // CORS pre‑flight
  if (req.method === "OPTIONS") return new Response("ok", { headers: customCorsHeaders });

  try {
    const { userId, planId, returnUrl } = await req.json();

    /* ---------- sanity checks ---------- */
    if (!userId || !planId) {
      return new Response(JSON.stringify({ error: "userId and planId are required" }), {
        status: 400, headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = priceMap[planId];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `planId "${planId}" not configured` }), {
        status: 400, headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ---------- fetch user email ---------- */
    const { data: uData, error: uErr } = await supabase.auth.admin.getUserById(userId);
    if (uErr || !uData?.user?.email) {
      console.error("getUserById error", uErr);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ---------- ensure Stripe customer ---------- */
    const { data: custRow } = await supabase
      .from("customer_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = custRow?.stripe_customer_id;
    if (!customerId) {
      console.log(`No existing Stripe customer for user ${userId}, creating new customer`);
      const customer = await stripe.customers.create({
        email: uData.user.email!,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      console.log(`Created new Stripe customer with ID: ${customerId}`);

      // IMPORTANT: We no longer create a database record here.
      // The webhook will create the subscription record only after successful payment
    } else {
      console.log(`Found existing Stripe customer ID ${customerId} for user ${userId}`);
    }

    /* ---------- create checkout session ---------- */
    console.log(`Creating checkout session for customer ${customerId} with plan ${planId} (price: ${priceId})`);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl || SITE_URL + "/checkout-complete"}?success=true&auto_close=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url : `${returnUrl || SITE_URL + "/checkout-complete"}?canceled=true`,
      subscription_data: { metadata: { user_id: userId } },
      // We store the user_id and the stripe_customer_id in the session metadata to use later
      metadata: { user_id: userId, stripe_customer_id: customerId }
    });
    
    console.log(`Created checkout session: ${session.id}, url: ${session.url}`);
    console.log(`Note: subscription_id will be assigned by Stripe after checkout completion`);

    // We don't update any subscription record here - we'll wait for the webhook

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout fatal", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
