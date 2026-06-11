'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/utils/push'

const acceptTaskSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
})

export async function acceptTask(rawInput) {
  const parsed = acceptTaskSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Invalid input data' }
  const { taskId } = parsed.data

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }
  
  // Prevent accepting own task
  const { data: checkTask } = await supabase.from('tasks').select('seeker_id').eq('id', taskId).single();
  if (checkTask && checkTask.seeker_id === user.id) {
    return { success: false, error: 'You cannot accept your own task.' };
  }

  // Atomic Update to prevent race conditions
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'accepted', helper_id: user.id, accepted_at: new Date().toISOString() })
    .match({ id: taskId, status: 'open' })
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: 'Task is no longer available or does not exist.' }
  }

  // Notify seeker
  await supabase.from('notifications').insert({
    user_id: data.seeker_id,
    title: 'Task Accepted! 🤝',
    body: `A helper has accepted your task: "${data.title}"`,
    data: {
      type: 'task_accepted',
      route: `/chat/${data.id}`
    }
  });

  // Send Push Notification
  const { data: seekerProfile } = await supabase.from('profiles').select('fcm_token').eq('id', data.seeker_id).single();
  if (seekerProfile && seekerProfile.fcm_token) {
    await sendPushNotification(
      seekerProfile.fcm_token,
      'Task Accepted! 🤝',
      `A helper has accepted your task: "${data.title}"`,
      { type: 'task_accepted', taskId: data.id }
    );
  }

  revalidatePath('/helper')
  return { success: true, task: data }
}

export async function cancelTask(rawInput) {
  const parsed = acceptTaskSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: 'Invalid input data' };
  const { taskId } = parsed.data;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // Fetch task to check accepted_at
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('accepted_at, helper_id, status, seeker_id, title')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) return { success: false, error: 'Task not found' };
  if (task.helper_id !== user.id) return { success: false, error: 'Not your task' };
  if (task.status !== 'accepted') return { success: false, error: 'Task is not accepted' };

  // Check 3-minute grace period
  const acceptedTime = new Date(task.accepted_at).getTime();
  const now = Date.now();
  const diffMinutes = (now - acceptedTime) / (1000 * 60);
  
  let penaltyApplied = false;

  if (diffMinutes > 3) {
    // Past 3 mins: deduct 15 trust score
    const { data: profile } = await supabase.from('profiles').select('trust_score').eq('id', user.id).single();
    const currentScore = profile?.trust_score || 100;
    const newScore = Math.max(0, currentScore - 15);
    
    await supabase.from('profiles').update({ trust_score: newScore }).eq('id', user.id);
    penaltyApplied = true;
  }

  // Set task back to open
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'open', helper_id: null, accepted_at: null })
    .eq('id', taskId);

  if (updateError) return { success: false, error: 'Failed to cancel task' };

  // Notify seeker
  await supabase.from('notifications').insert({
    user_id: task.seeker_id,
    title: 'Task Cancelled ⚠️',
    body: `A helper cancelled your task: "${task.title}". It is back on the open market.`,
    data: { type: 'alert' }
  });

  // Send Push Notification
  const { data: seekerProfile } = await supabase.from('profiles').select('fcm_token').eq('id', task.seeker_id).single();
  if (seekerProfile && seekerProfile.fcm_token) {
    await sendPushNotification(
      seekerProfile.fcm_token,
      'Task Cancelled ⚠️',
      `A helper cancelled your task: "${task.title}". It is back on the open market.`,
      { type: 'alert', taskId }
    );
  }

  revalidatePath('/helper');
  return { success: true, penaltyApplied };
}

export async function completeTask(taskId) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // Fetch task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('pay, helper_id, status, seeker_id, title')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) return { success: false, error: 'Task not found' };
  if (task.helper_id !== user.id) return { success: false, error: 'Not your task' };
  if (task.status !== 'accepted') return { success: false, error: 'Task is not accepted' };

  // 1. Mark task as completed, transfer funds, update trust score, notify users
  const { error: updateError } = await supabase.rpc('complete_task_with_trust', {
    p_task_id: taskId
  });

  if (updateError) return { success: false, error: 'Failed to complete task: ' + updateError.message };

  // Send Push Notification
  const { data: seekerProfile } = await supabase.from('profiles').select('fcm_token').eq('id', task.seeker_id).single();
  if (seekerProfile && seekerProfile.fcm_token) {
    await sendPushNotification(
      seekerProfile.fcm_token,
      'Task Completed! ✅',
      `Your task "${task.title}" has been marked as completed. Please review your helper.`,
      { type: 'task_completed', taskId }
    );
  }

  revalidatePath('/helper/tasks');
  return { success: true };
}

const toggleSchema = z.boolean()

export async function toggleOnlineStatus(currentStatus) {
  const parsed = toggleSchema.safeParse(currentStatus)
  if (!parsed.success) return { success: false, error: 'Invalid status type' }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }
  
  const newStatus = !parsed.data

  const { error } = await supabase
    .from('profiles')
    .update({ is_available: newStatus })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: 'Failed to update status' }
  }

  revalidatePath('/helper')
  return { success: true, is_available: newStatus }
}

const submitOfferSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
  proposedPay: z.number().min(1, "Pay must be greater than 0")
})

export async function submitOffer(rawInput) {
  const parsed = submitOfferSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Invalid input data' }
  
  const { taskId, proposedPay } = parsed.data
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  // Check if task is still open
  const { data: task, error: taskError } = await supabase.from('tasks').select('status, seeker_id, title').eq('id', taskId).single()
  if (taskError || !task || task.status !== 'open') {
    return { success: false, error: 'Task is no longer open for offers.' }
  }

  if (task.seeker_id === user.id) {
    return { success: false, error: 'Cannot bid on your own task.' }
  }

  // Insert or update offer
  const { error: offerError } = await supabase.from('task_offers').upsert({
    task_id: taskId,
    helper_id: user.id,
    proposed_pay: proposedPay,
    status: 'pending',
    updated_at: new Date().toISOString()
  }, { onConflict: 'task_id, helper_id' })

  if (offerError) return { success: false, error: 'Failed to submit offer: ' + offerError.message }

  // Notify seeker about the new offer
  await supabase.from('notifications').insert({
    user_id: task.seeker_id,
    title: 'New Offer Received! 💸',
    body: `A helper has proposed ₹${proposedPay} for your task: "${task.title}"`,
    data: { type: 'new_offer', taskId: taskId }
  });

  const { data: seekerProfile } = await supabase.from('profiles').select('fcm_token').eq('id', task.seeker_id).single();
  if (seekerProfile && seekerProfile.fcm_token) {
    await sendPushNotification(
      seekerProfile.fcm_token,
      'New Offer Received! 💸',
      `A helper has proposed ₹${proposedPay} for your task: "${task.title}"`,
      { type: 'new_offer', taskId }
    );
  }

  revalidatePath('/helper')
  return { success: true }
}
