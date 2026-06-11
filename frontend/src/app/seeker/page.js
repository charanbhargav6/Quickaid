import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PostTaskModal from '@/components/PostTaskModal';
import RealtimeTaskList from '@/components/RealtimeTaskList';
import { Suspense } from 'react';
import NearbyHelpers from '@/components/NearbyHelpers';
import IncomingOffers from '@/components/IncomingOffers';

export default async function SeekerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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
          <NearbyHelpers />
        </section>

        {/* Incoming Offers Section */}
        <IncomingOffers userId={user.id} />

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
