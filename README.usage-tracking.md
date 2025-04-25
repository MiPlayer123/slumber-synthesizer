# Dream Usage Tracking

This document explains how weekly dream usage tracking is implemented to ensure accurate counting of free tier users' dream creations and analyses.

## Overview

The app provides free tier users with a limited number of dream image generations and analyses per week (Sunday to Saturday). The quota resets at midnight UTC on Sunday.

## Previous Implementation Issue

In the previous implementation, the app would count dreams and analyses by directly querying the `dreams` and `dream_analyses` tables. This approach had a bug: when a user deleted a dream, the count would decrease, effectively giving the user back their "used" quota. This allowed users to bypass the free tier limits by creating and deleting dreams repeatedly.

## Fixed Implementation

The updated implementation adds a `usage_logs` table that tracks dream creation and analysis independently of the dream's existence. This ensures that even if a dream is deleted, the usage count remains accurate.

### Key Components

1. **Usage Logs Table**: Permanently records each usage instance
   ```sql
   CREATE TABLE usage_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     type TEXT NOT NULL, -- 'dream_image' or 'dream_analysis'
     count INTEGER NOT NULL DEFAULT 1,
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
   );
   ```

2. **Usage Counting Function**: SQL function to count usage since a specific date
   ```sql
   CREATE FUNCTION public.count_user_usage_since(
     user_id_input UUID, 
     usage_type TEXT,
     since_date TIMESTAMPTZ
   )
   RETURNS INTEGER LANGUAGE SQL SECURITY DEFINER 
   AS $$
     SELECT COALESCE(SUM(count), 0)::INTEGER
     FROM usage_logs
     WHERE 
       user_id = user_id_input AND
       type = usage_type AND
       created_at >= since_date;
   $$;
   ```

3. **Recording Usage**: When a user generates a dream image or analysis, we record it in the `usage_logs` table:
   ```typescript
   const logUsage = async (type: 'image' | 'analysis') => {
     // Insert a new usage log
     await supabase
       .from('usage_logs')
       .insert([
         { 
           user_id: user.id, 
           type: type === 'image' ? 'dream_image' : 'dream_analysis',
           created_at: new Date().toISOString()
         }
       ]);
   };
   ```

4. **Counting Usage**: When determining if a user has reached their limit, we check the `usage_logs` table rather than counting dreams directly:
   ```typescript
   const { count: imageUsageCount } = await supabase.rpc(
     'count_user_usage_since',
     { 
       user_id_input: user.id,
       usage_type: 'dream_image',
       since_date: startOfWeek.toISOString()
     }
   );
   ```

### Migration Strategy

The implementation includes fallback mechanisms to ensure backward compatibility:

1. First, try using the new RPC function if it exists
2. If not, try querying the usage_logs table directly
3. If that fails, fall back to the original counting methods (querying dreams/analyses tables)

This allows for a gradual migration without service disruption.

## Testing

To verify this is working correctly:
1. Create a dream (will use 1 of 3 free slots)
2. Delete that dream
3. Check that you still have only 2 remaining free slots (not back to 3)
4. Wait until Sunday UTC to verify that the counter resets properly 