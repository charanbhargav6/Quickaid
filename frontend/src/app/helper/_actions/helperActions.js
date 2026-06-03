'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const acceptTaskSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
})

export async function acceptTask(rawInput) {
  const parsed = acceptTaskSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Invalid input data' }
  const { taskId } = parsed.data

  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }
  
  if (user.app_metadata?.role !== 'helper') {
    return { success: false, error: 'Forbidden: Only helpers can accept tasks' }
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

  revalidatePath('/helper')
  return { success: true, task: data }
}

export async function cancelTask(rawInput) {
  const parsed = acceptTaskSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: 'Invalid input data' };
  const { taskId } = parsed.data;

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // Fetch task to check accepted_at
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('accepted_at, helper_id, status')
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

  revalidatePath('/helper');
  return { success: true, penaltyApplied };
}

export async function completeTask(taskId) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // Fetch task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('pay, helper_id, status')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) return { success: false, error: 'Task not found' };
  if (task.helper_id !== user.id) return { success: false, error: 'Not your task' };
  if (task.status !== 'accepted') return { success: false, error: 'Task is not accepted' };

  // 1. Mark task as completed
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId);

  if (updateError) return { success: false, error: 'Failed to complete task' };

  // 2. Fetch current helper earnings
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_earnings')
    .eq('id', user.id)
    .single();
    
  const currentEarnings = Number(profile?.total_earnings || 0);
  const newEarnings = currentEarnings + Number(task.pay || 0);

  // 3. Update total_earnings for helper
  await supabase
    .from('profiles')
    .update({ total_earnings: newEarnings })
    .eq('id', user.id);

  // 4. Create payout transaction
  await supabase.from('transactions').insert({
    task_id: taskId,
    user_id: user.id,
    amount: task.pay,
    type: 'payout',
    status: 'completed'
  });

  revalidatePath('/helper/tasks');
  return { success: true };
}

const toggleSchema = z.boolean()

export async function toggleOnlineStatus(currentStatus) {
  const parsed = toggleSchema.safeParse(currentStatus)
  if (!parsed.success) return { success: false, error: 'Invalid status type' }

  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }
  
  if (user.app_metadata?.role !== 'helper') {
    return { success: false, error: 'Forbidden' }
  }

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
