'use client';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import TaskReviewModal from '@/components/TaskReviewModal';
import AlertModal from '@/components/AlertModal';
import { cancelTask } from '@/app/seeker/_actions/taskActions';

export default function RealtimeTaskList({ initialTasks, userId }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [reviewTask, setReviewTask] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false });
  const [cancellingId, setCancellingId] = useState(null);
  const [, startTransition] = useTransition();

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
          if (updated.status === 'completed') setReviewTask(updated);
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleCancelTask = (task) => {
    setAlertModal({
      isOpen: true,
      title: 'Cancel Task?',
      message: `Are you sure you want to cancel "${task.title}"? Your payment of Rs.${Number(task.pay).toFixed(2)} will be refunded to your wallet.`,
      type: 'warning',
      primaryActionText: 'Yes, Cancel Task',
      secondaryActionText: 'Keep Task',
      onSecondaryAction: () => setAlertModal({ isOpen: false }),
      onPrimaryAction: async () => {
        setAlertModal({ isOpen: false });
        setCancellingId(task.id);
        startTransition(async () => {
          const res = await cancelTask(task.id);
          setCancellingId(null);
          if (!res.success) {
            setAlertModal({
              isOpen: true,
              title: 'Cancel Failed',
              message: res.error || 'Could not cancel task.',
              type: 'danger',
              primaryActionText: 'Ok',
              onPrimaryAction: () => setAlertModal({ isOpen: false })
            });
          }
        });
      }
    });
  };

  const statusColor = (status) => {
    if (status === 'open') return 'badge-blue';
    if (status === 'completed') return 'badge-green';
    if (status === 'accepted') return 'badge-purple';
    if (status === 'cancelled') return 'badge-gray';
    if (status === 'disputed') return 'badge-red';
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
            <th>Actions</th>
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
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{task.description}</div>
              </td>
              <td>
                <span className={`badge ${statusColor(task.status)}`}>
                  {task.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </td>
              <td>Rs.{task.pay ? Number(task.pay).toFixed(2) : (task.price ? Number(task.price).toFixed(2) : '0.00')}</td>
              <td>{new Date(task.created_at).toLocaleDateString()}</td>
              <td>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {task.status === 'completed' && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => setReviewTask(task)}
                    >
                      Rate Helper
                    </button>
                  )}
                  {(task.status === 'open' || task.status === 'accepted') && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#ef4444', color: '#ef4444', opacity: cancellingId === task.id ? 0.6 : 1 }}
                      onClick={() => handleCancelTask(task)}
                      disabled={cancellingId === task.id}
                    >
                      {cancellingId === task.id ? '...' : 'Cancel'}
                    </button>
                  )}
                  {task.status === 'cancelled' && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Refunded</span>
                  )}
                  {!['open','accepted','completed','cancelled'].includes(task.status) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                  )}
                </div>
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

      <AlertModal {...alertModal} />
    </>
  );
}
