'use client';

import { useNotifications } from '@/components/NotificationProvider';

export default function NotificationsClient() {
  const { notifications, markAsRead } = useNotifications();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Notifications</h1>
      
      <div className="card">
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            You have no notifications right now.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif, i) => (
              <div 
                key={notif.id} 
                onClick={() => {
                  if (!notif.is_read) markAsRead(notif.id);
                  if (notif.link) window.location.href = notif.link;
                  else if (notif.data?.route) {
                    const params = new URLSearchParams();
                    if (notif.data.taskId) params.append('taskId', notif.data.taskId);
                    window.location.href = notif.data.route + (params.toString() ? '?' + params.toString() : '');
                  }
                }}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: i === notifications.length - 1 ? 'none' : '1px solid var(--border)',
                  background: notif.is_read ? 'transparent' : 'var(--primary-light)',
                  cursor: notif.link || notif.data?.route || !notif.is_read ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.5rem', background: 'var(--card-bg)', padding: '0.5rem', borderRadius: '50%' }}>
                    {(notif.type === 'message' || notif.data?.type === 'message') ? '💬' : 
                     (notif.type === 'task_accepted' || notif.data?.type === 'task_accepted') ? '🤝' : 
                     (notif.type === 'task_completed' || notif.data?.type === 'task_completed' || notif.data?.type === 'review_request') ? '✅' : '🔔'}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{notif.title}</h3>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{notif.message || notif.body}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', marginLeft: 'auto', marginTop: '0.5rem' }}></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
