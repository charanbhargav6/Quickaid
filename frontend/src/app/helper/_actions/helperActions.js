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
    .update({ status: 'accepted', helper_id: user.id })
    .match({ id: taskId, status: 'open' })
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: 'Task is no longer available or does not exist.' }
  }

  revalidatePath('/helper')
  return { success: true, task: data }
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
