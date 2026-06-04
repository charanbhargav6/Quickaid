'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HelperEarningsPage() {
  const router = useRouter();
  const [completedTasks, setCompletedTasks] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('helper_id', currentUser.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (data) {
      setCompletedTasks(data);
      const total = data.reduce((sum, task) => sum + (Number(task.pay) || 0), 0);
      setTotalEarnings(total);
    }
    setLoading(false);
  };

  if (loading) {
    return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Earnings</h1>
      
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center', backgroundColor: 'var(--primary)', color: 'white' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 400, opacity: 0.9, marginBottom: '0.5rem', marginTop: 0 }}>Total Earnings</h2>
        <div style={{ fontSize: '48px', fontWeight: 700 }}>₹{totalEarnings.toFixed(2)}</div>
      </div>
      
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Earning History</h2>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--slate-100)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Task Title</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Date Completed</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedTasks.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No completed tasks yet.
                </td>
              </tr>
            ) : (
              completedTasks.map(task => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{task.title}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--green-600)' }}>
                    +₹{task.pay?.toFixed(2)}
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
