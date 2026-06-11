'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const postTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  price: z.number().positive("Price must be positive"),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export async function postTask(formData) {
  // Validate Payload
  const parsed = postTaskSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  
  const supabase = await createClient();

  // Authorization Check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  if (user.app_metadata?.role !== 'seeker' && user.app_metadata?.role !== 'both') {
    // Allow both roles if they have both
  }

  // 1. Fetch wallet balance
  const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
  const balance = Number(profile?.wallet_balance || 0);

  if (balance < parsed.data.price) {
    return { success: false, error: 'Insufficient funds. Please add funds to your wallet first.' };
  }

  // 2. Deduct from wallet
  const newBalance = balance - parsed.data.price;
  const { error: walletError } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
  if (walletError) return { success: false, error: 'Payment processing failed.' };

  // 3. Create Task
  const { data: task, error: taskError } = await supabase.from('tasks').insert({
    seeker_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    pay: parsed.data.price,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    status: 'open'
  }).select().single()

  if (taskError) {
    // Rollback is omitted for dummy MVP
    return { success: false, error: 'Failed to post task to database.' }
  }

  // 4. Create Escrow Transaction
  await supabase.from('transactions').insert({
    task_id: task.id,
    user_id: user.id,
    amount: parsed.data.price,
    type: 'escrow',
    status: 'completed'
  });

  // Revalidate the seeker dashboard cache
  revalidatePath('/seeker')
  
  return { success: true, task: task }
}

const acceptOfferSchema = z.object({
  offerId: z.string().uuid("Invalid Offer ID"),
})

export async function acceptOffer(rawInput) {
  const parsed = acceptOfferSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Invalid input data' }
  const { offerId } = parsed.data

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  // 1. Fetch the offer to verify it exists and is pending
  const { data: offer, error: offerError } = await supabase.from('task_offers').select('*, tasks(*)').eq('id', offerId).single()
  if (offerError || !offer || offer.status !== 'pending') return { success: false, error: 'Offer is no longer available' }
  
  if (offer.tasks.seeker_id !== user.id) return { success: false, error: 'You do not own this task' }
  if (offer.tasks.status !== 'open') return { success: false, error: 'Task is already accepted or completed' }

  // 2. Adjust wallet if proposed pay > original pay
  const priceDifference = offer.proposed_pay - offer.tasks.pay
  if (priceDifference > 0) {
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
    const balance = Number(profile?.wallet_balance || 0)
    if (balance < priceDifference) {
      return { success: false, error: `You need ₹${priceDifference} more in your wallet to accept this offer.` }
    }
    // Deduct difference
    await supabase.from('profiles').update({ wallet_balance: balance - priceDifference }).eq('id', user.id)
    
    // Add escrow record for the difference
    await supabase.from('transactions').insert({
      task_id: offer.task_id,
      user_id: user.id,
      amount: priceDifference,
      type: 'escrow',
      status: 'completed'
    })
  } else if (priceDifference < 0) {
    // Refund difference
    const refund = Math.abs(priceDifference)
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
    const balance = Number(profile?.wallet_balance || 0)
    await supabase.from('profiles').update({ wallet_balance: balance + refund }).eq('id', user.id)
  }

  // 3. Update task
  const { error: taskUpdateError } = await supabase.from('tasks').update({
    status: 'accepted',
    helper_id: offer.helper_id,
    pay: offer.proposed_pay,
    accepted_at: new Date().toISOString()
  }).eq('id', offer.task_id)

  if (taskUpdateError) return { success: false, error: 'Failed to assign task' }

  // 4. Update offers (accept this one, reject all others)
  await supabase.from('task_offers').update({ status: 'accepted' }).eq('id', offerId)
  await supabase.from('task_offers').update({ status: 'rejected' }).eq('task_id', offer.task_id).eq('status', 'pending')

  // 5. Notify helper
  await supabase.from('notifications').insert({
    user_id: offer.helper_id,
    title: 'Offer Accepted! 🎉',
    body: `Your counter-offer of ₹${offer.proposed_pay} for "${offer.tasks.title}" was accepted!`,
    data: { type: 'offer_accepted', route: `/chat/${offer.task_id}` }
  })

  // (Push notification will be sent from client or we can import push.js here but to avoid circular deps we just send it if push.js is accessible)
  // Let's assume we send push notification as well
  const { sendPushNotification } = await import('@/utils/push')
  const { data: helperProfile } = await supabase.from('profiles').select('fcm_token').eq('id', offer.helper_id).single()
  if (helperProfile?.fcm_token) {
    await sendPushNotification(helperProfile.fcm_token, 'Offer Accepted! 🎉', `Your counter-offer of ₹${offer.proposed_pay} for "${offer.tasks.title}" was accepted!`)
  }

  revalidatePath('/seeker')
  return { success: true }
}
