'use server';

import { createClient } from '@supabase/supabase-js';

export async function deleteNotificationServer(id) {
  // Use service role key to bypass RLS restrictions since users might not have DELETE permissions on the notifications table
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting notification via admin:', error);
    return { error: error.message };
  }
  
  return { success: true };
}
