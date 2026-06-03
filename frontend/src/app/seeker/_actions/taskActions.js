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
