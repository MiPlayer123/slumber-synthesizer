#!/usr/bin/env node

/**
 * Subscription Verification and Repair Script
 * 
 * This script checks subscriptions in both Stripe and the database,
 * identifying and fixing discrepancies to ensure consistency.
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const dotenv = require('dotenv');
const { Command } = require('commander');
const inquirer = require('inquirer');

// Load environment variables
dotenv.config();

// Parse command line arguments
const program = new Command();
program
  .option('-f, --fix', 'Automatically fix identified issues')
  .option('-u, --user-id <userId>', 'Check a specific user ID')
  .option('-v, --verbose', 'Show detailed logs')
  .option('-s, --simulate', 'Simulate fixes without actually making changes')
  .parse(process.argv);

const options = program.opts();

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Logging utility
const log = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => options.verbose && console.log(`[DEBUG] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
};

// Main verification process
async function verifySubscriptions() {
  try {
    log.info('Starting subscription verification...');

    // 1. Query database for subscriptions
    let query = supabase.from('customer_subscriptions').select('*');
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
      log.info(`Checking specific user: ${options.userId}`);
    }
    
    const { data: subscriptions, error } = await query;
    
    if (error) {
      log.error(`Failed to fetch subscriptions: ${error.message}`);
      return;
    }
    
    log.info(`Found ${subscriptions.length} subscription records in database`);
    
    // Issues tracking
    const issues = [];
    const fixedIssues = [];
    
    // 2. Check each subscription record
    for (const sub of subscriptions) {
      log.debug(`Checking subscription for user ${sub.user_id}`);
      
      // Skip if no customer_id
      if (!sub.stripe_customer_id) {
        log.warn(`User ${sub.user_id} has no Stripe customer ID`);
        issues.push({
          type: 'missing_customer_id',
          user_id: sub.user_id,
          subscription: sub
        });
        continue;
      }
      
      // Check if status and subscription_status match
      if (sub.status !== sub.subscription_status && sub.status && sub.subscription_status) {
        log.warn(`User ${sub.user_id} has mismatched status (${sub.status}) and subscription_status (${sub.subscription_status})`);
        issues.push({
          type: 'status_mismatch',
          user_id: sub.user_id,
          subscription: sub
        });
        
        if (options.fix) {
          await fixStatusMismatch(sub);
          fixedIssues.push(`Fixed status mismatch for user ${sub.user_id}`);
        }
      }
      
      // Verify with Stripe
      try {
        // If we have a subscription ID, check it in Stripe
        if (sub.subscription_id) {
          const stripeSubscription = await stripe.subscriptions.retrieve(sub.subscription_id);
          log.debug(`Stripe subscription status: ${stripeSubscription.status}`);
          
          // Check if status matches
          if (stripeSubscription.status !== sub.subscription_status) {
            log.warn(`User ${sub.user_id} has Stripe status ${stripeSubscription.status} but DB status ${sub.subscription_status}`);
            issues.push({
              type: 'stripe_status_mismatch',
              user_id: sub.user_id,
              subscription: sub,
              stripe_status: stripeSubscription.status
            });
            
            if (options.fix) {
              await fixStripeStatusMismatch(sub, stripeSubscription);
              fixedIssues.push(`Fixed Stripe status mismatch for user ${sub.user_id}`);
            }
          }
        } 
        // If no subscription ID but status is active, that's a problem
        else if (sub.subscription_status === 'active') {
          log.warn(`User ${sub.user_id} has active status but no subscription_id`);
          issues.push({
            type: 'active_without_subscription_id',
            user_id: sub.user_id,
            subscription: sub
          });
          
          // Check if user has subscriptions in Stripe
          const stripeSubscriptions = await stripe.subscriptions.list({
            customer: sub.stripe_customer_id,
            limit: 1,
            status: 'all'
          });
          
          if (stripeSubscriptions.data.length > 0) {
            log.info(`Found Stripe subscription ${stripeSubscriptions.data[0].id} for user ${sub.user_id}`);
            
            if (options.fix) {
              await fixMissingSubscriptionId(sub, stripeSubscriptions.data[0]);
              fixedIssues.push(`Added subscription_id for user ${sub.user_id}`);
            }
          } else {
            log.warn(`No subscriptions found in Stripe for user ${sub.user_id}`);
            
            if (options.fix) {
              await fixFalseActive(sub);
              fixedIssues.push(`Fixed false active status for user ${sub.user_id}`);
            }
          }
        }
      } catch (stripeError) {
        // Invalid subscription ID
        if (stripeError.code === 'resource_missing') {
          log.warn(`User ${sub.user_id} has invalid subscription_id ${sub.subscription_id}`);
          issues.push({
            type: 'invalid_subscription_id',
            user_id: sub.user_id,
            subscription: sub
          });
          
          if (options.fix) {
            await fixInvalidSubscriptionId(sub);
            fixedIssues.push(`Fixed invalid subscription_id for user ${sub.user_id}`);
          }
        } else {
          log.error(`Stripe error for user ${sub.user_id}: ${stripeError.message}`);
        }
      }
    }
    
    // 3. Summary
    log.info('\n==== Verification Summary ====');
    log.info(`Found ${issues.length} issues`);
    
    if (issues.length > 0 && !options.fix) {
      log.info('Run with --fix to automatically fix these issues');
    }
    
    if (fixedIssues.length > 0) {
      log.success(`Fixed ${fixedIssues.length} issues:`);
      fixedIssues.forEach(fix => log.success(`- ${fix}`));
    }
    
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    console.error(error);
  }
}

// Fix functions
async function fixStatusMismatch(sub) {
  if (options.simulate) {
    log.info(`[SIMULATE] Would fix status mismatch for user ${sub.user_id}`);
    return;
  }
  
  // Use subscription_status as the source of truth
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      status: sub.subscription_status,
    })
    .eq('user_id', sub.user_id);
    
  if (error) {
    log.error(`Failed to fix status mismatch: ${error.message}`);
  } else {
    log.success(`Fixed status mismatch for user ${sub.user_id}`);
  }
}

async function fixStripeStatusMismatch(sub, stripeSubscription) {
  if (options.simulate) {
    log.info(`[SIMULATE] Would update DB status to match Stripe (${stripeSubscription.status}) for user ${sub.user_id}`);
    return;
  }
  
  let statusToSet = stripeSubscription.status;
  
  // Handling special case for canceled subscriptions that are still in their paid period
  if (stripeSubscription.status === 'canceled' && 
      stripeSubscription.current_period_end * 1000 > Date.now()) {
    statusToSet = 'active';
    log.info(`Setting canceled subscription as 'active' because paid period still valid until ${new Date(stripeSubscription.current_period_end * 1000)}`);
  }
  
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      status: statusToSet,
      subscription_status: statusToSet,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', sub.user_id);
    
  if (error) {
    log.error(`Failed to fix Stripe status mismatch: ${error.message}`);
  } else {
    log.success(`Updated status to ${statusToSet} for user ${sub.user_id}`);
  }
}

async function fixMissingSubscriptionId(sub, stripeSubscription) {
  if (options.simulate) {
    log.info(`[SIMULATE] Would add subscription_id ${stripeSubscription.id} for user ${sub.user_id}`);
    return;
  }
  
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      subscription_id: stripeSubscription.id,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', sub.user_id);
    
  if (error) {
    log.error(`Failed to add subscription_id: ${error.message}`);
  } else {
    log.success(`Added subscription_id ${stripeSubscription.id} for user ${sub.user_id}`);
  }
}

async function fixFalseActive(sub) {
  if (options.simulate) {
    log.info(`[SIMULATE] Would set status to 'inactive' for user ${sub.user_id} (no valid subscription found)`);
    return;
  }
  
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      status: 'inactive',
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', sub.user_id);
    
  if (error) {
    log.error(`Failed to fix false active status: ${error.message}`);
  } else {
    log.success(`Set status to 'inactive' for user ${sub.user_id}`);
  }
}

async function fixInvalidSubscriptionId(sub) {
  if (options.simulate) {
    log.info(`[SIMULATE] Would clear invalid subscription_id for user ${sub.user_id}`);
    return;
  }
  
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({
      subscription_id: null,
      status: 'inactive',
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', sub.user_id);
    
  if (error) {
    log.error(`Failed to clear invalid subscription_id: ${error.message}`);
  } else {
    log.success(`Cleared invalid subscription_id for user ${sub.user_id}`);
  }
}

// Run the verification if executed directly
if (require.main === module) {
  verifySubscriptions();
}

module.exports = { verifySubscriptions }; 