// Fix subscription status directly
const { createClient } = require('@supabase/supabase-js');

// Replace these with your Supabase URL and anon key
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://api.lucidrem.com';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const USER_ID = process.env.USER_ID || '3a9a98cb-73f2-4273-9c2e-3593ed890428'; // Use the ID from the error message

async function fixSubscription() {
  if (!SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_ANON_KEY. Please set it in your environment variables.');
    return;
  }

  console.log(`Attempting to fix subscription for user ${USER_ID}`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // First check if customer_subscriptions record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing subscription:', checkError);
      return;
    }
    
    if (existingRecord) {
      // Update existing record
      console.log('Found existing subscription record, updating...');
      const { data: updateData, error: updateError } = await supabase
        .from('customer_subscriptions')
        .update({
          subscription_status: 'active', // Force active status
          updated_at: new Date().toISOString()
        })
        .eq('user_id', USER_ID);
      
      if (updateError) {
        console.error('Error updating subscription:', updateError);
      } else {
        console.log('Successfully updated subscription to active status');
      }
    } else {
      // Create new record
      console.log('No subscription record found, creating new one...');
      const { data: insertData, error: insertError } = await supabase
        .from('customer_subscriptions')
        .insert({
          user_id: USER_ID,
          subscription_status: 'active', // Force active status
          subscription_id: 'manual-activation', // Placeholder
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating subscription:', insertError);
      } else {
        console.log('Successfully created active subscription');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixSubscription().catch(console.error); 