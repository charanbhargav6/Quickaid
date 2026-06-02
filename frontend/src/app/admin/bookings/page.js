'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BookingsPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, accepted, completed, cancelled

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          seeker:seeker_id(full_name, phone),
          helper:helper_id(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Bookings & Tasks</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Monitor all active and past tasks across the platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'open', 'accepted', 'completed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: '1px solid', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                background: filter === f ? 'var(--green-500)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                borderColor: filter === f ? 'var(--green-500)' : 'var(--border)',
                transition: 'all 0.2s'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>TASK ID</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>TITLE & CATEGORY</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>SEEKER</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>HELPER</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>PAYOUT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No tasks found for this filter.</td></tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>#{task.id.split('-')[0]}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{task.category || 'Other'}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: task.status === 'completed' ? 'var(--green-100)' : task.status === 'accepted' ? 'var(--blue-100)' : task.status === 'cancelled' ? 'var(--red-100)' : 'var(--slate-100)',
                      color: task.status === 'completed' ? 'var(--green-700)' : task.status === 'accepted' ? 'var(--blue-700)' : task.status === 'cancelled' ? 'var(--red-700)' : 'var(--slate-700)'
                    }}>
                      {task.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: '600' }}>{task.seeker?.full_name || 'Unknown'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{task.seeker?.phone || 'No phone'}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px' }}>
                    {task.helper ? (
                      <>
                        <div style={{ fontWeight: '600' }}>{task.helper.full_name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{task.helper.phone || 'No phone'}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontWeight: '700', color: 'var(--green-600)' }}>
                    ₹{task.pay}
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
