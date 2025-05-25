# Stripe Promo Code Integration

This document explains how to set up and use promo codes with Stripe in your application.

## Overview

The promo code system consists of:
1. **Edge Functions**: Server-side functions to manage coupons and promotion codes
2. **Frontend Components**: UI components for entering and validating promo codes
3. **Management Script**: A Node.js script to create and manage promo codes

## Setup

### 1. Edge Functions

Two edge functions have been created:

#### `create-checkout` (Updated)
- Now supports an optional `promoCode` parameter
- Validates promo codes before creating checkout sessions
- Enables `allow_promotion_codes` for customer-facing discount entry

#### `manage-promo-codes` (New)
- Creates and manages Stripe coupons
- Creates promotion codes from coupons
- Validates promotion codes
- Lists active promotion codes
- Deactivates promotion codes

### 2. Frontend Integration

#### PromoCodeInput Component
Located at `src/components/subscription/PromoCodeInput.tsx`

Features:
- Real-time promo code validation
- Visual feedback for valid/invalid codes
- Discount information display
- Integration with subscription checkout

#### Settings Page Integration
The promo code input has been added to the subscription section in `src/pages/Settings.tsx`

### 3. Subscription Hook Updates
The `useSubscription` hook now includes:
- `validatePromoCode()` function
- Updated `startCheckout()` to accept promo codes

## Usage

### For Administrators

#### Creating Promo Codes

1. **Using the Management Script**:
   ```bash
   # Set environment variables
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   
   # Run the script
   node scripts/create-promo-code.js
   ```

2. **Using the Edge Function Directly**:
   ```javascript
   // Create a coupon first
   const couponResponse = await fetch('/api/functions/v1/manage-promo-codes', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       action: 'create_coupon',
       name: 'Black Friday 2024',
       percent_off: 25,
       duration: 'once'
     })
   });
   
   // Then create a promotion code
   const promoResponse = await fetch('/api/functions/v1/manage-promo-codes', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       action: 'create_promotion_code',
       coupon_id: 'coupon_id_from_above',
       code: 'BLACKFRIDAY25'
     })
   });
   ```

#### Managing Promo Codes

**List Active Codes**:
```javascript
const response = await fetch('/api/functions/v1/manage-promo-codes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'list_promotion_codes',
    active: true
  })
});
```

**Validate a Code**:
```javascript
const response = await fetch('/api/functions/v1/manage-promo-codes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'validate_promo_code',
    code: 'BLACKFRIDAY25'
  })
});
```

**Deactivate a Code**:
```javascript
const response = await fetch('/api/functions/v1/manage-promo-codes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'deactivate_promotion_code',
    promotion_code_id: 'promo_code_id'
  })
});
```

### For Users

Users can enter promo codes in the subscription section:

1. Navigate to Settings → Subscription
2. Enter a promo code in the "Promo Code" field
3. Click "Apply" to validate the code
4. If valid, the discount will be shown and applied at checkout
5. Click "Subscribe Now" to proceed with the discounted checkout

## Coupon Types

### Percentage Discounts
```javascript
{
  name: "25% Off",
  percent_off: 25,
  duration: "once" // "once", "repeating", "forever"
}
```

### Fixed Amount Discounts
```javascript
{
  name: "$5 Off",
  amount_off: 500, // Amount in cents
  currency: "usd",
  duration: "once"
}
```

### Duration Options
- **once**: Applies to the first payment only
- **repeating**: Applies for a specified number of months
- **forever**: Applies to all future payments

### Additional Options
- `max_redemptions`: Limit total uses across all customers
- `redeem_by`: Expiration date for the coupon
- `first_time_transaction`: Only for new customers
- `minimum_amount`: Minimum order amount required

## Stripe Dashboard Setup

### 1. Enable Promotion Codes
1. Go to your Stripe Dashboard
2. Navigate to Products → Coupons
3. Ensure promotion codes are enabled in your account settings

### 2. Customer Portal Configuration
Make sure your Stripe Customer Portal is configured to show promotion code fields if you want customers to enter codes directly in Stripe's interface.

## Security Considerations

1. **Validation**: All promo codes are validated server-side before applying discounts
2. **Rate Limiting**: Consider implementing rate limiting on the validation endpoint
3. **Logging**: All promo code usage is logged for audit purposes
4. **Expiration**: Set appropriate expiration dates for time-sensitive promotions

## Testing

### Test Promo Codes
Create test promotion codes in your Stripe test environment:

```bash
# Using the management script with test keys
SUPABASE_URL="your-test-supabase-url" \
SUPABASE_ANON_KEY="your-test-anon-key" \
node scripts/create-promo-code.js
```

### Example Test Codes
- `TEST25` - 25% off first payment
- `WELCOME10` - $10 off first payment
- `FOREVER20` - 20% off forever

## Troubleshooting

### Common Issues

1. **"Invalid promo code" error**:
   - Check if the code exists in Stripe
   - Verify the code is active
   - Check expiration dates and usage limits

2. **Validation fails**:
   - Ensure edge function environment variables are set
   - Check Stripe API key permissions
   - Verify network connectivity

3. **Code not applying at checkout**:
   - Confirm `allow_promotion_codes` is enabled
   - Check if the code is valid for the specific product/price
   - Verify customer eligibility (first-time customer restrictions, etc.)

### Debug Mode
Enable debug logging in the edge functions by setting the log level to debug in your Supabase dashboard.

## API Reference

### Edge Function Actions

#### `create_coupon`
Creates a new Stripe coupon.

**Parameters**:
- `name` (required): Coupon name
- `percent_off` or `amount_off` (required): Discount amount
- `currency`: Currency for fixed amount discounts
- `duration`: "once", "repeating", or "forever"
- `duration_in_months`: For repeating coupons
- `max_redemptions`: Maximum total uses
- `redeem_by`: Expiration date

#### `create_promotion_code`
Creates a customer-facing promotion code from a coupon.

**Parameters**:
- `coupon_id` (required): ID of the coupon to create code for
- `code`: Custom code (auto-generated if not provided)
- `max_redemptions`: Maximum uses for this specific code
- `expires_at`: Expiration date for this code
- `first_time_transaction`: Boolean for new customers only

#### `validate_promo_code`
Validates a promotion code.

**Parameters**:
- `code` (required): The promotion code to validate

#### `list_promotion_codes`
Lists promotion codes.

**Parameters**:
- `active`: Filter by active status
- `limit`: Number of codes to return
- `code`: Filter by specific code
- `customer`: Filter by customer

#### `deactivate_promotion_code`
Deactivates a promotion code.

**Parameters**:
- `promotion_code_id` (required): ID of the promotion code to deactivate

## Best Practices

1. **Naming Convention**: Use clear, memorable codes (e.g., `SUMMER2024`, `WELCOME20`)
2. **Expiration Dates**: Always set expiration dates for promotional campaigns
3. **Usage Limits**: Set reasonable usage limits to prevent abuse
4. **Testing**: Always test promo codes in your test environment first
5. **Monitoring**: Monitor promo code usage and redemption rates
6. **Documentation**: Keep track of active campaigns and their purposes

## Support

For issues related to:
- **Stripe Integration**: Check Stripe documentation and dashboard
- **Edge Functions**: Review Supabase function logs
- **Frontend Issues**: Check browser console for errors
- **General Questions**: Refer to this documentation or create an issue 