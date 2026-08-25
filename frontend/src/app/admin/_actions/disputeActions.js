'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function fetchDisputes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      seeker:seeker_id(full_name, email),
      helper:helper_id(full_name, email)
    `)
    .eq('status', 'disputed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disputes:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function resolveDispute(taskId, resolution, adminId, adminNotes = '') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    // 1. Fetch task
    const { data: task, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('pay, seeker_id, helper_id, status')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) return { success: false, error: 'Task not found' };
    if (task.status !== 'disputed') return { success: false, error: 'Task is not disputed' };

    const payAmount = Number(task.pay || 0);

    if (resolution === 'seeker') {
      // Resolve to Seeker: Cancel task, refund seeker
      
      // Update task
      await supabaseAdmin.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
      
      // Refund Seeker (if applicable in your system)
      if (payAmount > 0) {
        const { data: seeker } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', task.seeker_id).single();
        const newBalance = Number(seeker.wallet_balance || 0) + payAmount;
        await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', task.seeker_id);
        
        // Log transaction
        await supabaseAdmin.from('transactions').insert({
          user_id: task.seeker_id,
          amount: payAmount,
          type: 'refund',
          description: 'Refund from disputed task'
        });
      }

      // Notify users
      const seekerMsg = 'Dispute resolved in your favor. Task cancelled and refunded.' + (adminNotes ? `\n\nAdmin Note: ${adminNotes}` : '');
      const helperMsg = 'Dispute resolved in favor of the seeker. Task cancelled.' + (adminNotes ? `\n\nAdmin Note: ${adminNotes}` : '');
      
      await supabaseAdmin.from('notifications').insert([
        { user_id: task.seeker_id, title: 'Dispute Resolved', body: seekerMsg },
        { user_id: task.helper_id, title: 'Dispute Resolved', body: helperMsg }
      ]);

    } else if (resolution === 'helper') {
      // Resolve to Helper: Complete task, pay helper (minus fee)
      
      await supabaseAdmin.from('tasks').update({ status: 'completed' }).eq('id', taskId);
      
      if (payAmount > 0) {
        // Calculate 10% platform fee
        const platformFee = payAmount * 0.10;
        const helperPayout = payAmount - platformFee;

        // Pay helper
        const { data: helper } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', task.helper_id).single();
        const newBalance = Number(helper.wallet_balance || 0) + helperPayout;
        await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', task.helper_id);
        
        // Log transaction (this makes it show up in Admin Earnings)
        await supabaseAdmin.from('transactions').insert({
          user_id: task.helper_id,
          amount: helperPayout,
          type: 'earning',
          description: 'Dispute Payment | Admin resolved'
        });
      }

      // Notify users
      const seekerMsg = 'Dispute resolved in favor of the helper. Task marked as completed.' + (adminNotes ? `\n\nAdmin Note: ${adminNotes}` : '');
      const helperMsg = 'Dispute resolved in your favor. Funds transferred to your wallet.' + (adminNotes ? `\n\nAdmin Note: ${adminNotes}` : '');

      await supabaseAdmin.from('notifications').insert([
        { user_id: task.seeker_id, title: 'Dispute Resolved', body: seekerMsg },
        { user_id: task.helper_id, title: 'Dispute Resolved', body: helperMsg }
      ]);
    }

    revalidatePath('/admin/disputes');
    return { success: true };
  } catch (err) {
    console.error('Resolve dispute error:', err);
    return { success: false, error: err.message };
  }
}
