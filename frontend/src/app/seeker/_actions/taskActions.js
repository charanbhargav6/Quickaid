'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const postTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  price: z.number().positive("Price must be positive"),
})

export async function postTask(formData) {
  // Validate Payload
  const parsed = postTaskSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  
  const supabase = createClient()

  // Authorization Check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  if (user.app_metadata?.role !== 'seeker') {
    return { success: false, error: 'Forbidden: Only seekers can post tasks' }
  }

  // Execute database mutation
  const { data, error } = await supabase.from('tasks').insert({
    seeker_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    price: parsed.data.price,
    status: 'open'
  }).select().single()

  if (error) {
    return { success: false, error: 'Failed to post task to database.' }
  }

  // Revalidate the seeker dashboard cache
  revalidatePath('/seeker')
  
  return { success: true, task: data }
}
