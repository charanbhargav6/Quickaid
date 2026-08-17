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

export async function getUserDetails(targetUserId) {
  try {
    const supabase = await createClient();
    
    // 1. Verify caller is authenticated and admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin') return { success: false, error: 'Unauthorized' };

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) return { success: false, error: 'User not found' };

    // 3. Fetch Task History
    // Get tasks where user is seeker or helper
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, pay, seeker_id, helper_id, created_at')
      .or(`seeker_id.eq.${targetUserId},helper_id.eq.${targetUserId}`)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('[getUserDetails] tasks error:', tasksError);
    }

    return { 
      success: true, 
      profile, 
      tasks: tasks || [] 
    };
  } catch (err) {
    console.error('Error fetching user details:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
