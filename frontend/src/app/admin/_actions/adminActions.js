'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function changeUserRole(targetUserId, newRole) {
  try {
    const supabase = await createClient();
    
    // 1. Verify caller is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // 2. Verify caller is an admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized: Only admins can change roles.' };

    // 3. Verify valid role
    const validRoles = ['seeker', 'helper', 'both', 'admin'];
    if (!validRoles.includes(newRole)) return { success: false, error: 'Invalid role.' };

    // 4. Update the user's role using service key
    const { error } = await supabaseAdmin.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    
    if (error) {
      console.error('[changeUserRole] DB error:', error.message);
      return { success: false, error: 'Failed to update user role.' };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Error changing user role:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
