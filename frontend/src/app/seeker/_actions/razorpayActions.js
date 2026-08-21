'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Step 1: Create a Razorpay order on the server.
 * This gives us an order_id that the client-side SDK needs to open the payment popup.
 */
export async function createRazorpayOrder(amount) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!amount || amount < 10) {
    return { success: false, error: 'Minimum deposit amount is ₹10.' };
  }

  try {
    // Razorpay amount is in paise (1 INR = 100 paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `wallet_topup_${user.id}_${Date.now()}`,
      notes: {
        user_id: user.id,
        purpose: 'wallet_topup',
      },
    });

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (err) {
    console.error('[createRazorpayOrder] Error:', err);
    return { success: false, error: 'Failed to initiate payment. Please try again.' };
  }
}

/**
 * Step 2: Verify the payment signature on the server (CRITICAL for security).
 * Only credit the wallet AFTER the signature is confirmed as authentic.
 */
export async function verifyAndCreditWallet({ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify signature to ensure payment is genuine and not tampered with
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('[verifyAndCreditWallet] Signature mismatch! Possible fraud attempt.');
    return { success: false, error: 'Payment verification failed. Please contact support.' };
  }

  // Signature is valid — now credit the wallet
  const amountInRupees = amount / 100; // Convert paise back to INR

  const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
  const newBalance = Number(profile?.wallet_balance || 0) + amountInRupees;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id);

  if (updateError) {
    console.error('[verifyAndCreditWallet] Balance update error:', updateError);
    return { success: false, error: 'Payment received but wallet credit failed. Please contact support with payment ID: ' + razorpay_payment_id };
  }

  // Record transaction history
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: amountInRupees,
    type: 'credit',
    description: `Razorpay | ${razorpay_payment_id}`,
  });

  // Send notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Deposit Successful 💰',
    body: `₹${amountInRupees} has been added to your wallet via Razorpay.`,
    data: { type: 'deposit_success', payment_id: razorpay_payment_id },
  });

  revalidatePath('/seeker/wallet');
  return { success: true, newBalance };
}
