'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HelperNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    }
  };

  if (loading) {
    return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Notifications</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notifications right now.</p>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: notification.is_read ? 'white' : 'var(--blue-50)',
                borderLeft: notification.is_read ? 'none' : '4px solid var(--primary)'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>{notification.title || 'Notification'}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{notification.message}</p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
              {!notification.is_read && (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '1rem' }}
                  onClick={() => markAsRead(notification.id)}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
