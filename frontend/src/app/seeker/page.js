import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PostTaskModal from '@/components/PostTaskModal';
import RealtimeTaskList from '@/components/RealtimeTaskList';
import { Suspense } from 'react';

export default async function SeekerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch active helpers
  const { data: activeHelpers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'helper')
    .eq('is_available', true);

  // Fetch initial tasks
  const { data: myTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('seeker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px' }}>Seeker Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <PostTaskModal />
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Active Helpers Section */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Active Helpers Available</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {!activeHelpers || activeHelpers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No helpers available right now.</p>
            ) : (
              activeHelpers.map(helper => (
                <div key={helper.id} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                    {helper.full_name ? helper.full_name[0] : 'H'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>{helper.full_name || 'Helper'}</h3>
                    <span className="badge badge-green" style={{ marginTop: '4px' }}>● Online</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* My Tasks Section */}
        <section>
          <div className="section-header">
            <h2 className="section-title">My Posted Tasks</h2>
          </div>
          <div className="card">
            <Suspense fallback={<div className="skeleton skeleton-box"></div>}>
              <RealtimeTaskList initialTasks={myTasks || []} userId={user.id} />
            </Suspense>
          </div>
        </section>
      </div>
    </>
  );
}
