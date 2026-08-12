'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { completeTask } from '../_actions/helperActions';
import Link from 'next/link';

export default function HelperTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        seeker:seeker_id(full_name, phone)
      `)
      .eq('helper_id', currentUser.id)
      .in('status', ['accepted', 'completed'])
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
    setLoading(false);
  };

  const handleMarkComplete = async (taskId) => {
    setProcessing(true);
    const result = await completeTask(taskId);
    setProcessing(false);
    
    if (result.success) {
      fetchTasks();
    } else {
      alert(result.error || 'Failed to complete task');
    }
  };

  if (loading) {
    return <div style={{padding: '24px'}}><div className="skeleton skeleton-box" style={{height: '150px'}}></div></div>;
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>My Tasks</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Track and manage your active and completed jobs.</p>
      </header>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ margin: 0 }}>No tasks found</h3>
            <p>You haven't accepted any tasks yet. Check the Live Map!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Status Ribbon */}
              <div style={{
                position: 'absolute', top: 0, right: 0, 
                backgroundColor: task.status === 'completed' ? 'var(--green-500)' : 'var(--blue-500)',
                color: 'white', padding: '6px 20px', fontSize: '0.75rem', fontWeight: 700,
                borderBottomLeftRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                {task.status}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 }}>{task.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray">{task.category?.replace('_', ' ').toUpperCase()}</span>
                    <span className="badge badge-gray">{task.task_type?.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{(task.pay ?? task.price)?.toFixed(2)}
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                {task.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Pickup</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ marginTop: '2px' }}>📍</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{task.location_name || 'Not specified'}</span>
                  </div>
                </div>

                {task.destination_name && (
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Dropoff</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ marginTop: '2px' }}>🏁</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{task.destination_name}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Seeker Contact</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {task.seeker?.full_name ? task.seeker.full_name[0] : 'S'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{task.seeker?.full_name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.seeker?.phone || 'No phone provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                {task.status === 'accepted' && (
                  <>
                    <Link href={`/helper/tasks/${task.id}/map`} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🗺️ Live Map & Directions
                    </Link>
                    <button 
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={() => handleMarkComplete(task.id)}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : '✅ Mark Complete'}
                    </button>
                  </>
                )}
                {task.status === 'completed' && (
                  <button className="btn btn-outline" disabled style={{ opacity: 0.6 }}>
                    Task Completed
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
