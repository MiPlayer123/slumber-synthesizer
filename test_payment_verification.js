#!/usr/bin/env node

/**
 * Payment Verification Test Script
 * 
 * This script tests the payment verification flow to ensure that users
 * don't get free subscriptions without successful payment.
 * 
 * Tests:
 * 1. Verify that a valid checkout session ID is properly verified
 * 2. Verify that an invalid session ID is rejected
 * 3. Simulate a webhook event for checkout.session.completed
 * 4. Simulate a webhook event for invoice.payment_succeeded
 */

const fetch = require('node-fetch');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

dotenv.config();

// Configuration
const BASE_URL = process.env.SITE_URL || 'http://localhost:5173';
const API_BASE = process.env.SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Check for required env vars
if (!SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('Missing required environment variables. Please set:');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- STRIPE_SECRET_KEY');
  process.exit(1);
}

// Helper to make authenticated requests
async function makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'x-client-info': 'payment-verification-test/1.0.0'
  };

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  const response = await fetch(`${API_BASE}/functions/v1/${endpoint}`, options);
  return { 
    ok: response.ok, 
    status: response.status,
    data: response.ok ? await response.json() : await response.text()
  };
}

// Create a test checkout session
async function createTestCheckoutSession(userId, planId = 'monthly') {
  console.log(`Creating test checkout session for user ${userId} with plan ${planId}...`);
  
  const result = await makeAuthenticatedRequest('create-checkout', 'POST', {
    userId,
    planId,
    returnUrl: `${BASE_URL}/checkout-complete`
  });

  if (!result.ok) {
    console.error('Failed to create checkout session:', result.data);
    process.exit(1);
  }

  console.log('Created checkout session:', result.data.url);
  return new URL(result.data.url).searchParams.get('session_id');
}

// Verify a checkout session
async function verifyPayment(userId, sessionId) {
  console.log(`Verifying payment for session ${sessionId}...`);
  
  const result = await makeAuthenticatedRequest('verify-payment', 'POST', {
    userId,
    sessionId
  });

  console.log('Verification result:', result);
  return result;
}

// Simulate a webhook event
async function simulateWebhookEvent(eventType, data) {
  console.log(`Simulating webhook event: ${eventType}`);
  
  // Create a payload that mimics what Stripe would send
  const payload = {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2022-11-15',
    created: Math.floor(Date.now() / 1000),
    type: eventType,
    data: {
      object: data
    }
  };
  
  // Sign the payload using the webhook secret
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');
  
  // Submit the webhook
  const headers = {
    'Content-Type': 'application/json',
    'Stripe-Signature': `t=${timestamp},v1=${signature}`,
    'x-client-info': 'payment-verification-test/1.0.0'
  };
  
  const response = await fetch(`${API_BASE}/functions/v1/stripe-webhook`, {
    method: 'POST',
    headers,
    body: payloadString
  });
  
  console.log('Webhook result:', response.status, await response.text());
  return response.ok;
}

// Main test function
async function runTests() {
  try {
    console.log('==== Payment Verification Test Suite ====');
    console.log(`API Base: ${API_BASE}`);
    
    // Get test user ID - you would normally get this from your database
    // This is just a placeholder, replace with a real user ID
    const testUserId = process.env.TEST_USER_ID || 'test_user_id';
    console.log(`Using test user ID: ${testUserId}`);
    
    // Test 1: Create and verify a valid checkout session
    const sessionId = await createTestCheckoutSession(testUserId);
    const verificationResult = await verifyPayment(testUserId, sessionId);
    
    if (verificationResult.ok && verificationResult.data.verified) {
      console.log('✅ Test 1 passed: Valid session verification works');
    } else {
      console.log('❌ Test 1 failed: Could not verify valid session');
    }
    
    // Test 2: Try to verify an invalid session ID
    const invalidSessionResult = await verifyPayment(testUserId, 'cs_invalid_session_id');
    
    if (!invalidSessionResult.ok || (invalidSessionResult.ok && !invalidSessionResult.data.verified)) {
      console.log('✅ Test 2 passed: Invalid session properly rejected');
    } else {
      console.log('❌ Test 2 failed: Invalid session was verified (security issue!)');
    }
    
    // Test 3: Simulate checkout.session.completed webhook
    const checkoutSessionData = {
      id: sessionId,
      object: 'checkout.session',
      payment_status: 'paid',
      mode: 'subscription',
      customer: 'cus_test123',
      subscription: 'sub_test123',
      status: 'complete'
    };
    
    const checkoutWebhookResult = await simulateWebhookEvent(
      'checkout.session.completed', 
      checkoutSessionData
    );
    
    if (checkoutWebhookResult) {
      console.log('✅ Test 3 passed: checkout.session.completed webhook processed');
    } else {
      console.log('❌ Test 3 failed: Could not process checkout.session.completed webhook');
    }
    
    // Test 4: Simulate invoice.payment_succeeded webhook
    const invoiceData = {
      id: 'in_test123',
      object: 'invoice',
      subscription: 'sub_test123',
      customer: 'cus_test123',
      status: 'paid',
      paid: true
    };
    
    const invoiceWebhookResult = await simulateWebhookEvent(
      'invoice.payment_succeeded', 
      invoiceData
    );
    
    if (invoiceWebhookResult) {
      console.log('✅ Test 4 passed: invoice.payment_succeeded webhook processed');
    } else {
      console.log('❌ Test 4 failed: Could not process invoice.payment_succeeded webhook');
    }
    
    console.log('\n==== Test Summary ====');
    console.log('All tests completed. Check logs for details.');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 