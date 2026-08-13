'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const postTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  price: z.number().min(50, "Minimum task price is ₹50"),
  task_type: z.enum(['physical', 'delivery', 'digital']).default('physical'),
  category: z.string().nullable().optional(),
  location_name: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  destination_name: z.string().nullable().optional(),
  destination_lat: z.number().nullable().optional(),
  destination_lng: z.number().nullable().optional(),
  vehicle_required: z.string().nullable().optional(),
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

  // 1. Fetch wallet balance and role
  const { data: profile } = await supabase.from('profiles').select('wallet_balance, role').eq('id', user.id).single();
  
  if (profile?.role === 'admin') {
    return { success: false, error: 'Admins are not allowed to post tasks.' };
  }

  const balance = Number(profile?.wallet_balance || 0);

  // Note: Platform fee is now deducted from the helper during payout. 
  // The Seeker simply pays the exact listed price.
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
    task_type: parsed.data.task_type,
    category: parsed.data.category,
    location_name: parsed.data.location_name,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    destination_name: parsed.data.destination_name,
    destination_lat: parsed.data.destination_lat,
    destination_lng: parsed.data.destination_lng,
    vehicle_required: parsed.data.vehicle_required ?? null,
    status: 'open'
  }).select().single()

  if (taskError) {
    return { success: false, error: 'Failed to post task to database. ' + taskError.message }
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
    await supabase.from('profiles').update({ wallet_balance: balance - priceDifference }).eq('id', user.id)
    await supabase.from('transactions').insert({
      task_id: offer.task_id,
      user_id: user.id,
      amount: priceDifference,
      type: 'escrow',
      status: 'completed'
    })
  } else if (priceDifference < 0) {
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

  // 4. Update offers
  await supabase.from('task_offers').update({ status: 'accepted' }).eq('id', offerId)
  await supabase.from('task_offers').update({ status: 'rejected' }).eq('task_id', offer.task_id).eq('status', 'pending')

  // 5. Notify helper
  await supabase.from('notifications').insert({
    user_id: offer.helper_id,
    title: 'Offer Accepted! 🎉',
    body: `Your counter-offer of ₹${offer.proposed_pay} for "${offer.tasks.title}" was accepted!`,
    data: { type: 'offer_accepted', route: `/chat/${offer.task_id}` }
  })

  const { sendPushNotification } = await import('@/utils/push')
  const { data: helperProfile } = await supabase.from('profiles').select('fcm_token').eq('id', offer.helper_id).single()
  if (helperProfile?.fcm_token) {
    await sendPushNotification(helperProfile.fcm_token, 'Offer Accepted! 🎉', `Your counter-offer of ₹${offer.proposed_pay} for "${offer.tasks.title}" was accepted!`)
  }

  revalidatePath('/seeker')
  return { success: true }
}

export async function cancelTask(taskId) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  // Fetch task to verify ownership and get the pay amount for refund
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('seeker_id, pay, status, helper_id')
    .eq('id', taskId)
    .single()

  if (taskError || !task) return { success: false, error: 'Task not found' }
  if (task.seeker_id !== user.id) return { success: false, error: 'You do not own this task' }
  if (!['open', 'accepted'].includes(task.status)) return { success: false, error: 'This task cannot be cancelled' }

  // Refund the pay to the seeker's wallet
  const payAmount = Number(task.pay || 0)
  if (payAmount > 0) {
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
    const newBalance = Number(profile?.wallet_balance || 0) + payAmount
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id)
    // Record refund transaction
    await supabase.from('transactions').insert({
      task_id: taskId,
      user_id: user.id,
      amount: payAmount,
      type: 'refund',
      status: 'completed'
    })
  }

  // Mark task cancelled
  await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId)

  // Notify helper if one was assigned (in-app + push)
  if (task.helper_id) {
    await supabase.from('notifications').insert({
      user_id: task.helper_id,
      title: 'Task Cancelled',
      body: 'The seeker has cancelled a task you accepted. Please check your wallet.',
      data: { type: 'task_cancelled', taskId }
    })

    // Send FCM push to helper
    const { sendPushNotification } = await import('@/utils/push')
    const { data: helperProfile } = await supabase.from('profiles').select('fcm_token').eq('id', task.helper_id).single()
    if (helperProfile?.fcm_token) {
      await sendPushNotification(
        helperProfile.fcm_token,
        'Task Cancelled ⚠️',
        'The seeker has cancelled a task you accepted. It is no longer available.',
        { type: 'task_cancelled', taskId }
      )
    }
  }

  revalidatePath('/seeker')
  return { success: true }
}

// ── Raise Dispute ─────────────────────────────────────────────────────
export async function raiseDispute(taskId, reason) {
  if (!taskId || !reason?.trim()) return { success: false, error: 'Task ID and reason are required' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  // Fetch task to verify ownership
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('seeker_id, helper_id, status, title')
    .eq('id', taskId)
    .single()

  if (taskError || !task) return { success: false, error: 'Task not found' }
  if (task.seeker_id !== user.id) return { success: false, error: 'You do not own this task' }
  if (!['accepted', 'in_progress'].includes(task.status)) {
    return { success: false, error: 'Only accepted or in-progress tasks can be disputed' }
  }

  // Mark task as disputed and save reason
  const { error: updateError } = await supabaseAdmin.from('tasks').update({ 
    status: 'disputed',
    dispute_reason: reason 
  }).eq('id', taskId)

  if (updateError) {
    console.error("Failed to update task to disputed:", updateError)
    return { success: false, error: 'Failed to update task status' }
  }

  // Notify admin via notifications table (admin reads disputed tasks from admin panel)
  await supabaseAdmin.from('notifications').insert({
    user_id: user.id, // seeker's own notification record
    title: 'Dispute Filed 🚩',
    body: `Your dispute for "${task.title}" has been submitted. Admin will review it shortly.`,
    data: { type: 'dispute_filed', taskId }
  })

  // Notify helper too
  if (task.helper_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: task.helper_id,
      title: 'Dispute Raised ⚠️',
      body: `The seeker has raised a dispute on task: "${task.title}". Admin will review.`,
      data: { type: 'dispute_raised', taskId }
    })
    // FCM push to helper
    const { sendPushNotification } = await import('@/utils/push')
    const { data: helperProfile } = await supabase.from('profiles').select('fcm_token').eq('id', task.helper_id).single()
    if (helperProfile?.fcm_token) {
      await sendPushNotification(
        helperProfile.fcm_token,
        'Dispute Raised ⚠️',
        `The seeker has raised a dispute on task: "${task.title}". Admin will review.`,
        { type: 'dispute_raised', taskId }
      )
    }
  }

  revalidatePath('/seeker')
  return { success: true }
}

