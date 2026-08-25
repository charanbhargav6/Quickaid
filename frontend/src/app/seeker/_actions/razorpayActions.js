'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Remove top-level initialization to prevent crashing on import if keys are missing

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
    console.log('[createRazorpayOrder] Key ID present:', !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
    console.log('[createRazorpayOrder] Key Secret present:', !!process.env.RAZORPAY_KEY_SECRET);
    console.log('[createRazorpayOrder] Creating order for amount (paise):', Math.round(amount * 100));

    const shortUserId = user.id.replace(/-/g, '').slice(0, 12); // 12 hex chars
    const receipt = `qaid_${shortUserId}_${Date.now().toString(36)}`; // max ~30 chars

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { success: false, error: 'Razorpay keys are not configured on the server.' };
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Razorpay amount is in paise (1 INR = 100 paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
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
    console.error('[createRazorpayOrder] Full error:', JSON.stringify(err, null, 2));
    console.error('[createRazorpayOrder] Error message:', err?.message);
    console.error('[createRazorpayOrder] Error description:', err?.error?.description);
    return { success: false, error: `Failed to initiate payment: ${err?.error?.description || err?.message || 'Unknown error'}` };
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
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    amount: amountInRupees,
    type: 'earning',
    description: `Razorpay Deposit | ${razorpay_payment_id}`,
  });

  if (txError) {
    console.error('[verifyAndCreditWallet] Failed to record transaction history:', txError);
    // Continue despite error so user isn't stuck without their money, but log it!
  }

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
