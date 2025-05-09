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
      console.log("Found customer data - status:", customerData.subscription_status);
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
    console.log("Creating portal session");
    const defaultReturnUrl = `${Deno.env.get("SITE_URL")}/settings?tab=subscription`;
    
    // Helper function to create portal session with auto-configuration fallback
    async function createPortalSession(customer: string, returnUrl: string) {
      try {
        return await stripe.billingPortal.sessions.create({
          customer,
          return_url: returnUrl
        });
      } catch (err) {
        // Handle "no configuration" error once, then re-throw others
        if (err?.raw?.message?.startsWith('No configuration provided')) {
          console.log("No portal configuration found, creating one automatically");
          
          // Create a minimal configuration on the fly
          const { product, prices } = await getCustomerProductAndPrices(customer);
          
          const cfg = await stripe.billingPortal.configurations.create({
            business_profile: {
              headline: 'LucidRem',
              privacy_policy_url: `${Deno.env.get('SITE_URL')}/privacy`,
              terms_of_service_url: `${Deno.env.get('SITE_URL')}/terms`
            },
            features: {
              payment_method_update: {
                enabled: true
              },
              subscription_cancel: { enabled: true, mode: 'at_period_end' },
              subscription_update: { 
                enabled: true, 
                proration_behavior: 'create_prorations',
                default_allowed_updates: ['price', 'promotion_code'],
                products: [
                  {
                    product,
                    prices
                  }
                ]
              }
            }
          });

          console.log("Created new portal configuration:", cfg.id);

          // now retry with that configuration
          return await stripe.billingPortal.sessions.create({
            customer,
            return_url: returnUrl,
            configuration: cfg.id
          });
        }
        throw err; // any other Stripe error
      }
    }
    
    // Helper function to get the product ID from customer's current subscription
    async function getCustomerProductId(customerId: string): Promise<string> {
      try {
        // Fetch customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length === 0) {
          console.log("No active subscriptions found for customer, using default product");
          // If no subscription found, use a default product ID
          // This is a placeholder - replace with your actual product ID
          return 'prod_P1wPUbIjbkDfz0'; // Replace with your product ID
        }
        
        // Get the subscription item's product ID
        const subscription = subscriptions.data[0];
        const items = subscription.items.data;
        
        if (items.length === 0) {
          console.log("No items in subscription, using default product");
          // Fallback to default product ID
          return 'prod_P1wPUbIjbkDfz0'; // Replace with your product ID
        }
        
        // Get price from the first item and fetch its product ID
        const price = await stripe.prices.retrieve(items[0].price.id);
        console.log(`Found product ID: ${price.product}`);
        
        return price.product as string;
      } catch (error) {
        console.error("Error fetching product ID:", error);
        // Fallback to default product ID
        return 'prod_P1wPUbIjbkDfz0'; // Replace with your product ID
      }
    }

    // Helper function to get the product and price IDs from customer's current subscription
    async function getCustomerProductAndPrices(customerId: string): Promise<{ product: string; prices: string[] }> {
      try {
        // Fetch customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length === 0) {
          console.log("No active subscriptions found for customer, using default product/price");
          // If no subscription found, use default product and price IDs
          return {
            product: 'prod_P1wPUbIjbkDfz0', // Replace with your default product ID
            prices: ['price_1ABCDxyzDefaultPrice'] // Replace with your default price ID
          };
        }
        
        // Get the subscription item's product and price ID
        const subscription = subscriptions.data[0];
        const items = subscription.items.data;
        
        if (items.length === 0) {
          console.log("No items in subscription, using default product/price");
          // Fallback to default product and price IDs
          return {
            product: 'prod_P1wPUbIjbkDfz0', // Replace with your default product ID
            prices: ['price_1ABCDxyzDefaultPrice'] // Replace with your default price ID
          };
        }
        
        // Get price from the first item and fetch its product ID
        const priceId = items[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        console.log(`Found product ID: ${price.product} and price ID: ${priceId}`);
        
        return {
          product: price.product as string,
          prices: [priceId]
        };
      } catch (error) {
        console.error("Error fetching product and price IDs:", error);
        // Fallback to default product and price IDs
        return {
          product: 'prod_P1wPUbIjbkDfz0', // Replace with your default product ID
          prices: ['price_1ABCDxyzDefaultPrice'] // Replace with your default price ID
        };
      }
    }
    
    try {
      const portalSession = await createPortalSession(stripeCustomerId, returnUrl || defaultReturnUrl);
      
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