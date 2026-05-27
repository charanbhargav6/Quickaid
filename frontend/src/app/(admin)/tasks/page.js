'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          seeker:profiles!seeker_id(full_name, email),
          helper:profiles!helper_id(full_name, email)
        `)
        .order('created_at', { ascending: false });
      setTasks(data || []);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus);

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));
      alert('Task deleted successfully.');
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <span className="badge badge-green">Completed</span>;
      case 'accepted': return <span className="badge badge-blue">In Progress</span>;
      case 'cancelled': return <span className="badge badge-red">Cancelled</span>;
      default: return <span className="badge badge-gray">Open</span>;
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Platform Tasks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View and monitor all tasks across the platform</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="accepted">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary" onClick={fetchTasks}>↻ Refresh</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="badge badge-orange">{task.category || 'General'}</span>
                {getStatusBadge(task.status)}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{task.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', flex: 1 }}>
                {task.description || 'No description provided.'}
              </p>
              
              <div style={{ background: 'var(--slate-50)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📍 Location:</span>
                  <span style={{ fontWeight: 600 }}>{task.location_name || 'Campus'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>💰 Pay:</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>₹{task.pay}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Posted by: </span><br/>
                  <strong>{task.seeker?.full_name || 'Unknown'}</strong>
                </div>
                {task.helper_id && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Helper: </span><br/>
                    <strong>{task.helper?.full_name || 'Unknown'}</strong>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleDelete(task.id)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--red-500)',
                    color: 'var(--red-600)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Delete Task
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
