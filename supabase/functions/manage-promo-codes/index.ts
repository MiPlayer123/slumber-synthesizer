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

const SUPABASE_URL = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE = required("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = required("STRIPE_SECRET_KEY");

// ---------- CLIENTS ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

// Custom CORS headers
const customCorsHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, X-Client-Info, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// ---------- HANDLER ----------
serve(async (req) => {
  // CORS pre‑flight
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: customCorsHeaders });

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "create_coupon":
        return await createCoupon(params);
      case "create_promotion_code":
        return await createPromotionCode(params);
      case "list_promotion_codes":
        return await listPromotionCodes(params);
      case "validate_promo_code":
        return await validatePromoCode(params);
      case "deactivate_promotion_code":
        return await deactivatePromotionCode(params);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...customCorsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (err) {
    console.error("manage-promo-codes error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Create a coupon in Stripe
async function createCoupon(params: any) {
  const {
    id,
    name,
    percent_off,
    amount_off,
    currency,
    duration,
    duration_in_months,
    max_redemptions,
    redeem_by,
  } = params;

  if (!name) {
    return new Response(
      JSON.stringify({ error: "Coupon name is required" }),
      {
        status: 400,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!percent_off && !amount_off) {
    return new Response(
      JSON.stringify({ error: "Either percent_off or amount_off is required" }),
      {
        status: 400,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const couponData: Stripe.CouponCreateParams = {
      name,
      duration: duration || "once",
    };

    if (id) couponData.id = id;
    if (percent_off) couponData.percent_off = percent_off;
    if (amount_off) {
      couponData.amount_off = amount_off;
      couponData.currency = currency || "usd";
    }
    if (duration_in_months) couponData.duration_in_months = duration_in_months;
    if (max_redemptions) couponData.max_redemptions = max_redemptions;
    if (redeem_by) couponData.redeem_by = Math.floor(new Date(redeem_by).getTime() / 1000);

    const coupon = await stripe.coupons.create(couponData);

    return new Response(JSON.stringify({ coupon }), {
      status: 200,
      headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Create a promotion code from an existing coupon
async function createPromotionCode(params: any) {
  const {
    coupon_id,
    code,
    customer,
    expires_at,
    first_time_transaction,
    max_redemptions,
    minimum_amount,
    minimum_amount_currency,
    restrictions,
  } = params;

  if (!coupon_id) {
    return new Response(
      JSON.stringify({ error: "Coupon ID is required" }),
      {
        status: 400,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const promotionCodeData: Stripe.PromotionCodeCreateParams = {
      coupon: coupon_id,
    };

    if (code) promotionCodeData.code = code;
    if (customer) promotionCodeData.customer = customer;
    if (expires_at) promotionCodeData.expires_at = Math.floor(new Date(expires_at).getTime() / 1000);
    if (first_time_transaction !== undefined) promotionCodeData.first_time_transaction = first_time_transaction;
    if (max_redemptions) promotionCodeData.max_redemptions = max_redemptions;
    if (minimum_amount) {
      promotionCodeData.minimum_amount = minimum_amount;
      promotionCodeData.minimum_amount_currency = minimum_amount_currency || "usd";
    }
    if (restrictions) promotionCodeData.restrictions = restrictions;

    const promotionCode = await stripe.promotionCodes.create(promotionCodeData);

    return new Response(JSON.stringify({ promotion_code: promotionCode }), {
      status: 200,
      headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating promotion code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// List promotion codes
async function listPromotionCodes(params: any) {
  const { active, code, coupon, customer, limit = 10 } = params;

  try {
    const listParams: Stripe.PromotionCodeListParams = {
      limit,
    };

    if (active !== undefined) listParams.active = active;
    if (code) listParams.code = code;
    if (coupon) listParams.coupon = coupon;
    if (customer) listParams.customer = customer;

    const promotionCodes = await stripe.promotionCodes.list(listParams);

    return new Response(JSON.stringify({ promotion_codes: promotionCodes.data }), {
      status: 200,
      headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing promotion codes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Validate a promotion code
async function validatePromoCode(params: any) {
  const { code } = params;

  if (!code) {
    return new Response(
      JSON.stringify({ error: "Promo code is required" }),
      {
        status: 400,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const promotionCodes = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid or expired promo code" 
        }),
        {
          status: 200,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const promotionCode = promotionCodes.data[0];
    const coupon = promotionCode.coupon;

    // Check if the promotion code is still valid
    const now = Math.floor(Date.now() / 1000);
    const isExpired = promotionCode.expires_at && promotionCode.expires_at < now;
    const isMaxRedemptionsReached = promotionCode.max_redemptions && 
      promotionCode.times_redeemed >= promotionCode.max_redemptions;

    if (isExpired || isMaxRedemptionsReached) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Promo code has expired or reached maximum redemptions" 
        }),
        {
          status: 200,
          headers: { ...customCorsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ 
        valid: true, 
        promotion_code: promotionCode,
        coupon: coupon,
        discount_info: {
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          duration_in_months: coupon.duration_in_months,
        }
      }),
      {
        status: 200,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error validating promo code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Deactivate a promotion code
async function deactivatePromotionCode(params: any) {
  const { promotion_code_id } = params;

  if (!promotion_code_id) {
    return new Response(
      JSON.stringify({ error: "Promotion code ID is required" }),
      {
        status: 400,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const promotionCode = await stripe.promotionCodes.update(promotion_code_id, {
      active: false,
    });

    return new Response(JSON.stringify({ promotion_code: promotionCode }), {
      status: 200,
      headers: { ...customCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deactivating promotion code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...customCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
} 