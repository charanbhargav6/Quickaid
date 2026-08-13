'use client';
import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchDisputes, resolveDispute } from '../_actions/disputeActions';

const supabase = createClient();

export default function DisputesPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputedTasks();
  }, []);

  async function fetchDisputedTasks() {
    setLoading(true);
    const result = await fetchDisputes();
    if (result.success) {
      setTasks(result.data || []);
    } else {
      console.error(result.error);
    }
    setLoading(false);
  }

  const [isPending, startTransition] = useTransition();

  async function handleResolve(taskId, resolution) {
    const actionText = resolution === 'seeker' ? 'Cancel task and refund Seeker' : 'Complete task and pay Helper';
    if (!confirm(`Are you sure you want to resolve in favor of the ${resolution}? This will: ${actionText}`)) return;
    
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await resolveDispute(taskId, resolution, user?.id);
      
      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        alert('Dispute resolved successfully.');
      } else {
        alert('Failed to resolve dispute: ' + result.error);
      }
    });
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--red-600)' }}>Disputed Tasks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review and resolve platform conflicts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={fetchDisputedTasks}>↻ Refresh</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {loading ? (
          <>
            <div className="skeleton skeleton-box"></div>
            <div className="skeleton skeleton-box"></div>
          </>
        ) : tasks.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: 'var(--slate-50)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>No active disputes 🎉</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>All tasks are running smoothly.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid var(--red-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="badge badge-orange">{task.category || 'General'}</span>
                <span className="badge badge-red">Disputed</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{task.title}</h3>
              
              <div style={{ background: 'var(--red-50)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--red-500)', marginBottom: '16px' }}>
                <strong style={{ color: 'var(--red-700)', fontSize: '12px', textTransform: 'uppercase' }}>Dispute Reason</strong>
                <p style={{ fontSize: '14px', color: 'var(--red-900)', marginTop: '4px', fontWeight: 500 }}>
                  {task.dispute_reason || 'No reason provided.'}
                </p>
              </div>
              
              <div style={{ background: 'var(--slate-50)', padding: '12px', borderRadius: '8px', marginBottom: '16px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>💰 Pay (in Escrow):</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>₹{task.pay}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Seeker: </span><br/>
                    <strong>{task.seeker?.full_name || 'Unknown'}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Helper: </span><br/>
                    <strong>{task.helper?.full_name || 'Unknown'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <button 
                  onClick={() => window.open(`/chat/${task.id}`, '_blank')}
                  style={{
                    background: 'var(--slate-100)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  📖 View Chat Logs
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleResolve(task.id, 'seeker')}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: '1px solid var(--blue-500)',
                      color: 'var(--blue-600)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Resolve to Seeker
                  </button>
                  <button 
                    onClick={() => handleResolve(task.id, 'helper')}
                    style={{
                      flex: 1,
                      background: 'var(--green-500)',
                      border: 'none',
                      color: 'white',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Resolve to Helper
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
