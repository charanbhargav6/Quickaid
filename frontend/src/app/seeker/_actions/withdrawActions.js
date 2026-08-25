'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function requestWithdrawal(amount) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (isNaN(amount) || amount < 10) {
      return { success: false, error: 'Minimum withdrawal amount is ₹10.' };
    }

    // 1. Fetch current profile balance
    const { data: profile } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', user.id).single();
    if (!profile) return { success: false, error: 'Profile not found.' };

    const currentBalance = Number(profile.wallet_balance || 0);
    if (currentBalance < amount) {
      return { success: false, error: 'Insufficient funds.' };
    }

    // 2. Atomically deduct balance using supabaseAdmin
    const newBalance = currentBalance - amount;
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .match({ id: user.id, wallet_balance: currentBalance })
      .select()
      .single();

    if (updateError || !updateData) {
      console.error('[requestWithdrawal] Atomic update failed:', updateError);
      return { success: false, error: 'Failed to process withdrawal or balance changed. Please try again.' };
    }

    // 3. Insert withdrawal transaction
    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: amount,
      type: 'withdrawal',
      description: 'UPI Withdrawal'
    });

    if (txError) {
      console.error('[requestWithdrawal] Failed to record transaction:', txError);
      // NOTE: We do not rollback because the money was logically withdrawn, 
      // but in a production app we'd need a robust transaction queue here.
    } else {
      // Send notification for successful withdrawal
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: 'Withdrawal Successful 🏦',
        body: `Your withdrawal of ₹${amount} has been processed successfully.`,
        data: { type: 'withdrawal_success' }
      });
    }

    revalidatePath('/seeker/wallet');
    return { success: true };
  } catch (err) {
    console.error('Error processing withdrawal:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
