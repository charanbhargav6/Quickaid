'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase'; // Using the browser client for sockets

export default function RealtimeTaskList({ initialTasks, userId }) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new tasks for this seeker
    const channel = supabase
      .channel('public:tasks')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `seeker_id=eq.${userId}` 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks((prev) => prev.map(t => t.id === payload.new.id ? payload.new : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (tasks.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        You haven't posted any tasks yet.
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Status</th>
          <th>Price</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map(task => (
          <tr key={task.id}>
            <td>
              <div style={{ fontWeight: 500 }}>{task.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{task.description}</div>
            </td>
            <td>
              <span className={`badge ${task.status === 'open' ? 'badge-blue' : task.status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
                {task.status.toUpperCase()}
              </span>
              {task.status === 'completed' && (
                <button 
                  className="btn btn-outline" 
                  style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => {
                    // Trigger modal logic here later
                    if(window) {
                      window.dispatchEvent(new CustomEvent('open-review-modal', { detail: task }));
                    }
                  }}
                >
                  Leave Review
                </button>
              )}
            </td>
            <td>${task.price?.toFixed(2)}</td>
            <td>{new Date(task.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
