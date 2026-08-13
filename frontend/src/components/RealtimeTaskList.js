'use client';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import TaskReviewModal from '@/components/TaskReviewModal';
import AlertModal from '@/components/AlertModal';
import { cancelTask, raiseDispute } from '@/app/seeker/_actions/taskActions';
import Link from 'next/link';

export default function RealtimeTaskList({ initialTasks, userId }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [reviewTask, setReviewTask] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false });
  const [cancellingId, setCancellingId] = useState(null);
  const [disputeModal, setDisputeModal] = useState({ isOpen: false, task: null });
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
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
                  {['accepted', 'completed', 'disputed'].includes(task.status) && task.helper_id && (
                    <Link
                      href={`/chat/${task.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '4px 10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      💬 Message
                    </Link>
                  )}
                  {task.status === 'accepted' && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#f59e0b', color: '#f59e0b' }}
                      onClick={() => { setDisputeReason(''); setDisputeModal({ isOpen: true, task }); }}
                    >
                      🚩 Dispute
                    </button>
                  )}
                  {task.status === 'cancelled' && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>💰 Refunded</span>
                  )}
                  {task.status === 'disputed' && (
                    <span style={{ color: '#f59e0b', fontSize: '12px' }}>⏳ Under Review</span>
                  )}
                  {!['open','accepted','completed','cancelled','disputed'].includes(task.status) && (
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

      {/* ── Dispute Modal ───────────────────────── */}
      <AnimatePresence>
        {disputeModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setDisputeModal({ isOpen: false, task: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="card"
              style={{ width: '100%', maxWidth: '480px', padding: '2rem', background: 'var(--card-bg)', borderRadius: '20px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>🚩 Raise a Dispute</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.25rem' }}>
                Describe your issue with task: <strong>{disputeModal.task?.title}</strong>. Admin will review and resolve.
              </p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Explain what went wrong (e.g. helper didn't show up, task incomplete...)"
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setDisputeModal({ isOpen: false, task: null })} disabled={disputeSubmitting}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                  disabled={disputeSubmitting || !disputeReason.trim()}
                  onClick={async () => {
                    if (!disputeReason.trim()) return;
                    setDisputeSubmitting(true);
                    const res = await raiseDispute(disputeModal.task.id, disputeReason);
                    setDisputeSubmitting(false);
                    setDisputeModal({ isOpen: false, task: null });
                    if (res.success) {
                      setAlertModal({ isOpen: true, title: 'Dispute Filed ✅', message: 'Your dispute has been submitted. Admin will review it shortly.', type: 'success', primaryActionText: 'OK', onPrimaryAction: () => setAlertModal({ isOpen: false }) });
                    } else {
                      setAlertModal({ isOpen: true, title: 'Error', message: res.error || 'Failed to raise dispute', type: 'danger', primaryActionText: 'OK', onPrimaryAction: () => setAlertModal({ isOpen: false }) });
                    }
                  }}
                >
                  {disputeSubmitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
