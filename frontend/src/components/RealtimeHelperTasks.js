'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { AnimatePresence } from 'framer-motion';
import AcceptTaskButton from '@/components/AcceptTaskButton';
import TaskReviewModal from '@/components/TaskReviewModal';

export default function RealtimeHelperTasks({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [myAcceptedTasks, setMyAcceptedTasks] = useState([]);
  const [reviewTask, setReviewTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const currentUserId = React.useRef(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        currentUserId.current = user.id;
        // Fetch tasks I've accepted
        supabase
          .from('tasks')
          .select('*')
          .eq('helper_id', user.id)
          .in('status', ['accepted', 'completed', 'cancelled', 'disputed'])
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setMyAcceptedTasks(data);
          });
      }
    });

    // Subscribe to open tasks
    const channel = supabase
      .channel('public:tasks:open')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
          setTasks((prev) => {
            if (currentUserId.current && payload.new.seeker_id === currentUserId.current) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status !== 'open') {
            setTasks((prev) => prev.filter(t => t.id !== payload.new.id));
          }
          // Update my accepted tasks
          if (payload.new.helper_id === currentUserId.current) {
            setMyAcceptedTasks((prev) => {
              const exists = prev.find(t => t.id === payload.new.id);
              if (exists) {
                return prev.map(t => t.id === payload.new.id ? payload.new : t);
              }
              return [payload.new, ...prev];
            });
            // Auto-prompt review when task is marked done by seeker
            if (payload.new.status === 'completed' || payload.new.status === 'cancelled') {
              setReviewTask(payload.new);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleMarkComplete = async (task) => {
    const supabase = createClient();
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    setReviewTask({ ...task, status: 'completed' });
  };

  const openTasks = tasks.length === 0 ? (
    <p style={{ color: 'var(--text-muted)' }}>No open tasks right now. Check back later!</p>
  ) : (
    tasks.map(task => (
      <div 
        key={task.id} 
        className="card" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid transparent' }}
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'none'}
        onClick={() => setSelectedTask(task)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{task.title}</h3>
          <span className="badge badge-blue">₹{task.pay?.toFixed(2) ?? task.price?.toFixed(2)}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(task.created_at).toLocaleDateString()}</span>
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>View Details</button>
        </div>
      </div>
    ))
  );

  return (
    <>
      {/* Open tasks grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {openTasks}
      </div>

      {/* My accepted/in-progress tasks */}
      {myAcceptedTasks.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>My Active Jobs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myAcceptedTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{task.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{task.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${task.status === 'completed' ? 'badge-green' : task.status === 'cancelled' ? 'badge-gray' : 'badge-purple'}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {task.status === 'in_progress' && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '13px', padding: '6px 14px' }}
                      onClick={() => handleMarkComplete(task)}
                    >
                      ✅ Mark Complete
                    </button>
                  )}
                  {(task.status === 'completed' || task.status === 'cancelled') && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => setReviewTask(task)}
                    >
                      ⭐ Rate Seeker
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {reviewTask && (
          <TaskReviewModal
            task={reviewTask}
            reviewerRole="helper"
            onClose={() => setReviewTask(null)}
            onSubmitted={() => setReviewTask(null)}
          />
        )}
        
        {selectedTask && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            padding: '1rem'
          }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--card-bg)', borderRadius: '20px' }}>
              <h2 style={{ marginBottom: '1rem', marginTop: 0, fontSize: '22px', fontWeight: 800 }}>Task Details</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedTask.title}</h3>
                <span className="badge badge-blue" style={{ fontSize: '16px' }}>₹{selectedTask.pay?.toFixed(2) ?? selectedTask.price?.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-gray">{selectedTask.category?.replace('_', ' ').toUpperCase()}</span>
                <span className="badge badge-gray">{selectedTask.task_type?.toUpperCase()}</span>
              </div>
              
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6' }}>{selectedTask.description}</p>
              </div>

              {selectedTask.location_name && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Pickup / Location:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{selectedTask.location_name}</p>
                </div>
              )}
              
              {selectedTask.destination_name && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <strong>Dropoff / Destination:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{selectedTask.destination_name}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedTask(null)}>Close</button>
                <div style={{ flex: 1 }}>
                  <AcceptTaskButton taskId={selectedTask.id} onSuccess={() => setSelectedTask(null)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
