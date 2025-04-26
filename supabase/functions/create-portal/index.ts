import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

// Debug logging
console.log("Function initialization - URL:", supabaseUrl);
console.log("Stripe key length:", stripeSecretKey ? stripeSecretKey.length : 0);

// Validate environment variables are set
if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error("Missing required environment variables!");
  if (!supabaseUrl) console.error("SUPABASE_URL is missing");
  if (!supabaseServiceKey) console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
  if (!stripeSecretKey) console.error("STRIPE_SECRET_KEY is missing");
}

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
    console.log("Request received:", req.url);
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { userId, customerId, returnUrl } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we don't have a customer ID, try to look it up along with subscription ID
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      console.log("Looking up customer data for user:", userId);
      const { data: customerData, error: customerError } = await supabase
        .from("customer_subscriptions")
        .select("stripe_customer_id, subscription_id, subscription_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (customerError) {
        console.error("Database error:", customerError);
        return new Response(
          JSON.stringify({ error: "Database error: " + customerError.message }),
          {
            status: 500,
            headers: { ...customCorsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!customerData?.stripe_customer_id) {
        console.error("Customer not found for user:", userId);
        return new Response(
          JSON.stringify({ error: "Customer not found" }),
          {
            status: 404,
            headers: { ...customCorsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      stripeCustomerId = customerData.stripe_customer_id;
      console.log("Found customer:", stripeCustomerId, "subscription:", customerData.subscription_id, "status:", customerData.subscription_status);
    }

    // Validate we have a valid customer ID
    if (!stripeCustomerId || !stripeCustomerId.startsWith('cus_')) {
      console.error("Invalid customer ID format:", stripeCustomerId);
      return new Response(
        JSON.stringify({ error: "Invalid customer ID format" }),
        {
          status: 400,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Create a portal session for the customer
    console.log("Creating portal session for customer:", stripeCustomerId);
    const defaultReturnUrl = `${Deno.env.get("SITE_URL")}/settings?tab=subscription`;
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl || defaultReturnUrl,
      });
      
      console.log("Portal session created successfully, URL length:", portalSession.url.length);
      
      return new Response(
        JSON.stringify({ url: portalSession.url }),
        {
          status: 200,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      
      // Check if we need to retrieve the customer from Stripe
      if (stripeError.message && stripeError.message.includes("No such customer")) {
        return new Response(
          JSON.stringify({ 
            error: "Customer not found in Stripe. The customer ID may be invalid.",
            details: stripeError.message
          }),
          {
            status: 404,
            headers: { ...customCorsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Stripe API error", 
          details: stripeError.message 
        }),
        {
          status: 500,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Uncaught error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error",
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}); 