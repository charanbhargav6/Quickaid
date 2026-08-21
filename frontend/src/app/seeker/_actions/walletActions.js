'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const addFundsSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1')
});

export async function addFunds(rawInput) {
  const parsed = addFundsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  
  const { amount } = parsed.data;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Fetch current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Failed to fetch profile' };
  }

  const newBalance = Number(profile.wallet_balance || 0) + amount;

  // 2. Update wallet_balance
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: 'Failed to add funds' };
  }

  // 3. Create a deposit transaction record
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: amount,
    type: 'credit' // 'credit' is allowed by DB constraint ('deposit' is not)
  });

  // 4. Send notification for successful deposit
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Deposit Successful 💰',
    body: `₹${amount} has been successfully added to your wallet.`,
    data: { type: 'deposit_success' }
  });

  revalidatePath('/seeker/wallet');
  return { success: true, newBalance };
}
