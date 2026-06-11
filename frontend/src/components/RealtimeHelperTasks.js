'use client';
import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import AcceptTaskButton from '@/components/AcceptTaskButton';

export default function RealtimeHelperTasks({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);

  const currentUserId = React.useRef(null);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) currentUserId.current = user.id;
    });

    // Subscribe to new 'open' tasks in the public schema
    const channel = supabase
      .channel('public:tasks:open')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
          // Do not show the task if the user is the one who posted it
          setTasks((prev) => {
            if (currentUserId.current && payload.new.seeker_id === currentUserId.current) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          // If a task is no longer open, remove it from the list
          if (payload.new.status !== 'open') {
             setTasks((prev) => prev.filter(t => t.id !== payload.new.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (tasks.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)' }}>No open tasks right now. Check back later!</p>
    );
  }

  return (
    <>
      {tasks.map(task => (
        <div key={task.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{task.title}</h3>
            <span className="badge badge-blue">${task.price?.toFixed(2)}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, flex: 1 }}>{task.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(task.created_at).toLocaleDateString()}</span>
            <AcceptTaskButton taskId={task.id} />
          </div>
        </div>
      ))}
    </>
  );
}
