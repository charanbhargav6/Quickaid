import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ToggleOnlineStatus from '@/components/ToggleOnlineStatus';
import RealtimeHelperTasks from '@/components/RealtimeHelperTasks';
import { Suspense } from 'react';

export default async function HelperDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch initial open tasks
  const { data: openTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px' }}>Helper Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ToggleOnlineStatus initialStatus={profile?.is_available || false} />
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Open Tasks Section */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Open Tasks Available</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <Suspense fallback={<div className="skeleton skeleton-box"></div>}>
              <RealtimeHelperTasks initialTasks={openTasks || []} />
            </Suspense>
          </div>
        </section>
      </div>
    </>
  );
}
