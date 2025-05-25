#!/usr/bin/env node

/**
 * Script to create and manage Stripe promotion codes
 * Usage: node scripts/create-promo-code.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration - Update these with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createCoupon() {
  console.log('\n=== Creating a new Stripe Coupon ===\n');
  
  const name = await question('Coupon name (e.g., "Black Friday 2024"): ');
  const discountType = await question('Discount type (1=percentage, 2=fixed amount): ');
  
  let percent_off, amount_off, currency;
  
  if (discountType === '1') {
    percent_off = parseInt(await question('Percentage off (e.g., 25 for 25%): '));
  } else {
    amount_off = parseInt(await question('Amount off in cents (e.g., 500 for $5.00): '));
    currency = await question('Currency (default: usd): ') || 'usd';
  }
  
  const duration = await question('Duration (once/repeating/forever, default: once): ') || 'once';
  let duration_in_months;
  
  if (duration === 'repeating') {
    duration_in_months = parseInt(await question('Duration in months: '));
  }
  
  const max_redemptions = await question('Max redemptions (optional, press enter to skip): ');
  const redeem_by = await question('Expiry date (YYYY-MM-DD, optional): ');
  
  const couponData = {
    action: 'create_coupon',
    name,
    duration,
  };
  
  if (percent_off) couponData.percent_off = percent_off;
  if (amount_off) {
    couponData.amount_off = amount_off;
    couponData.currency = currency;
  }
  if (duration_in_months) couponData.duration_in_months = duration_in_months;
  if (max_redemptions) couponData.max_redemptions = parseInt(max_redemptions);
  if (redeem_by) couponData.redeem_by = redeem_by;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-promo-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(couponData),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Coupon created successfully!');
      console.log('Coupon ID:', result.coupon.id);
      console.log('Coupon Details:', JSON.stringify(result.coupon, null, 2));
      return result.coupon.id;
    } else {
      console.error('❌ Error creating coupon:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function createPromotionCode(couponId) {
  console.log('\n=== Creating a Promotion Code ===\n');
  
  const code = await question('Promotion code (e.g., "BLACKFRIDAY25", leave empty for auto-generated): ');
  const max_redemptions = await question('Max redemptions for this code (optional): ');
  const expires_at = await question('Expiry date (YYYY-MM-DD, optional): ');
  const first_time_transaction = await question('First-time customers only? (y/n, default: n): ');
  
  const promoData = {
    action: 'create_promotion_code',
    coupon_id: couponId,
  };
  
  if (code) promoData.code = code.toUpperCase();
  if (max_redemptions) promoData.max_redemptions = parseInt(max_redemptions);
  if (expires_at) promoData.expires_at = expires_at;
  if (first_time_transaction === 'y') promoData.first_time_transaction = true;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-promo-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(promoData),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Promotion code created successfully!');
      console.log('Promotion Code:', result.promotion_code.code);
      console.log('Promotion Code ID:', result.promotion_code.id);
      console.log('Details:', JSON.stringify(result.promotion_code, null, 2));
    } else {
      console.error('❌ Error creating promotion code:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function listPromotionCodes() {
  console.log('\n=== Listing Promotion Codes ===\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-promo-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'list_promotion_codes',
        active: true,
        limit: 20,
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Active Promotion Codes:');
      result.promotion_codes.forEach((code, index) => {
        console.log(`\n${index + 1}. Code: ${code.code}`);
        console.log(`   ID: ${code.id}`);
        console.log(`   Times Redeemed: ${code.times_redeemed}`);
        console.log(`   Active: ${code.active}`);
        if (code.expires_at) {
          console.log(`   Expires: ${new Date(code.expires_at * 1000).toLocaleDateString()}`);
        }
      });
    } else {
      console.error('❌ Error listing promotion codes:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function validatePromotionCode() {
  console.log('\n=== Validate Promotion Code ===\n');
  
  const code = await question('Enter promotion code to validate: ');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-promo-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'validate_promo_code',
        code: code.toUpperCase(),
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      if (result.valid) {
        console.log('✅ Promotion code is valid!');
        console.log('Discount Info:', JSON.stringify(result.discount_info, null, 2));
      } else {
        console.log('❌ Promotion code is invalid or expired');
        console.log('Error:', result.error);
      }
    } else {
      console.error('❌ Error validating promotion code:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function main() {
  console.log('🎟️  Stripe Promotion Code Manager\n');
  
  if (SUPABASE_URL === 'your-supabase-url' || SUPABASE_ANON_KEY === 'your-supabase-anon-key') {
    console.log('⚠️  Please set your SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    console.log('   or update the configuration in this script.\n');
  }
  
  while (true) {
    console.log('\nWhat would you like to do?');
    console.log('1. Create a new coupon');
    console.log('2. Create a promotion code from existing coupon');
    console.log('3. Create both coupon and promotion code');
    console.log('4. List active promotion codes');
    console.log('5. Validate a promotion code');
    console.log('6. Exit');
    
    const choice = await question('\nEnter your choice (1-6): ');
    
    switch (choice) {
      case '1':
        await createCoupon();
        break;
      case '2':
        const couponId = await question('Enter existing coupon ID: ');
        await createPromotionCode(couponId);
        break;
      case '3':
        const newCouponId = await createCoupon();
        if (newCouponId) {
          await createPromotionCode(newCouponId);
        }
        break;
      case '4':
        await listPromotionCodes();
        break;
      case '5':
        await validatePromotionCode();
        break;
      case '6':
        console.log('Goodbye! 👋');
        rl.close();
        return;
      default:
        console.log('Invalid choice. Please try again.');
    }
  }
}

main().catch(console.error); 