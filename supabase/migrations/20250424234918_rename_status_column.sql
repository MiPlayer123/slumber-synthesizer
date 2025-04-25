-- Rename the 'status' column to 'subscription_status' in the customer_subscriptions table
ALTER TABLE public.customer_subscriptions
RENAME COLUMN status TO subscription_status;
