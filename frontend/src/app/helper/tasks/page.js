'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { completeTask } from '../_actions/helperActions';

export default function HelperTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
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
    setUser(currentUser);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
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
    return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>My Tasks</h1>
      
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--slate-100)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Title</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Price</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  You don't have any tasks yet.
                </td>
              </tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{task.title}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{task.description}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${task.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>${task.price?.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    {task.status === 'accepted' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '14px' }}
                        onClick={() => handleMarkComplete(task.id)}
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 'Mark Complete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
