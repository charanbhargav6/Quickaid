'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import TaskReviewModal from '@/components/TaskReviewModal';

export default function RealtimeTaskList({ initialTasks, userId }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [reviewTask, setReviewTask] = useState(null);

  useEffect(() => {
    const supabase = createClient();

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
          const updated = payload.new;
          setTasks((prev) => prev.map(t => t.id === updated.id ? updated : t));
          // Auto-prompt review when task becomes completed or cancelled
          if (updated.status === 'completed' || updated.status === 'cancelled') {
            setReviewTask(updated);
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const statusColor = (status) => {
    if (status === 'open') return 'badge-blue';
    if (status === 'completed') return 'badge-green';
    if (status === 'in_progress') return 'badge-purple';
    return 'badge-gray';
  };

  if (tasks.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        You haven't posted any tasks yet.
      </div>
    );
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Price</th>
            <th>Date</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => (
            <motion.tr 
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <td>
                <div style={{ fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{task.description}</div>
              </td>
              <td>
                <span className={`badge ${statusColor(task.status)}`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
              </td>
              <td>₹{task.pay ? Number(task.pay).toFixed(2) : (task.price ? Number(task.price).toFixed(2) : '0.00')}</td>
              <td>{new Date(task.created_at).toLocaleDateString()}</td>
              <td>
                {(task.status === 'completed' || task.status === 'cancelled') ? (
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setReviewTask(task)}
                  >
                    ⭐ Rate Helper
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      <AnimatePresence>
        {reviewTask && (
          <TaskReviewModal
            task={reviewTask}
            reviewerRole="seeker"
            onClose={() => setReviewTask(null)}
            onSubmitted={() => setReviewTask(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
