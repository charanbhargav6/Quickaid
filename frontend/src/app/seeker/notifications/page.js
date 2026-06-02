'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  if (loading) return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;

  return (
    <>
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px' }}>Notifications</h1>
      </header>
      <div style={{ padding: '2rem', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notifications yet.</p>
        ) : (
          notifications.map(notification => (
            <div key={notification.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: notification.is_read ? 0.7 : 1 }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: notification.is_read ? 'normal' : 'bold' }}>{notification.message}</p>
                <small style={{ color: 'var(--text-muted)' }}>{new Date(notification.created_at).toLocaleString()}</small>
              </div>
              {!notification.is_read && (
                <button className="btn btn-outline" onClick={() => markAsRead(notification.id)}>Mark as Read</button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
