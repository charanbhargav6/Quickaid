'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const reviewSchema = z.object({
  taskId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

export async function submitReview(rawInput) {
  const parsed = reviewSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Invalid input data' }
  const { taskId, revieweeId, rating, comment } = parsed.data

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  // Insert review
  const { data, error } = await supabase.from('reviews').insert({
    task_id: taskId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment
  }).select().single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'You have already reviewed this task.' }
    }
    return { success: false, error: error.message }
  }

  // Notify reviewee
  await supabase.from('notifications').insert({
    user_id: revieweeId,
    title: 'New Review Received! ⭐',
    body: `You received a ${rating}-star review for a completed task.`,
    data: {
      type: 'review_received',
      route: `/profile/${user.id}`
    }
  });

  revalidatePath('/seeker')
  return { success: true, review: data }
}
