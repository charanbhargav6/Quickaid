'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { createClient } from '@/lib/supabase';

export default function NotificationsClient() {
  const { notifications, markAsRead, deleteNotification } = useNotifications();

  const handleDismiss = async (e, notifId) => {
    e.stopPropagation();
    await deleteNotification(notifId);
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link) window.location.href = notif.link;
    else if (notif.data?.route) {
      const params = new URLSearchParams();
      if (notif.data.taskId) params.append('taskId', notif.data.taskId);
      window.location.href = notif.data.route + (params.toString() ? '?' + params.toString() : '');
    }
  };

  const getIcon = (notif) => {
    const t = notif.type || notif.data?.type;
    if (t === 'message') return '💬';
    if (t === 'task_accepted' || t === 'offer_accepted') return '🤝';
    if (t === 'task_completed' || t === 'review_request') return '✅';
    if (t === 'dispute_filed' || t === 'dispute_raised') return '⚠️';
    if (t === 'task_cancelled') return '❌';
    return '🔔';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {notifications.filter(n => !n.is_read).length} unread
          </span>
        )}
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1rem' }}>
            <span style={{ fontSize: '48px' }}>🔔</span>
            <p style={{ color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>You have no notifications right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif, i) => (
              <div
                key={notif.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  borderBottom: i === notifications.length - 1 ? 'none' : '1px solid var(--border)',
                  background: notif.is_read ? 'transparent' : 'rgba(var(--primary-rgb, 34,197,94), 0.05)',
                  cursor: (notif.link || notif.data?.route) ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                  position: 'relative',
                }}
                onClick={() => handleClick(notif)}
              >
                {/* Icon */}
                <div style={{
                  fontSize: '1.4rem',
                  width: '44px', height: '44px',
                  flexShrink: 0,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getIcon(notif)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 4px', color: 'var(--text-secondary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.message || notif.body}
                  </p>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Dismiss X button */}
                <button
                  title="Dismiss"
                  onClick={(e) => handleDismiss(e, notif.id)}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    width: '30px', height: '30px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    color: 'var(--text-muted)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
