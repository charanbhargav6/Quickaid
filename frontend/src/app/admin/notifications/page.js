'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchUserAndNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndNotifications();

    // Subscribe to realtime database changes
    const channel = supabase
      .channel('realtime-notifications-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          // Re-fetch notifications to get fresh state
          fetchUserAndNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id, currentStatus) => {
    if (currentStatus) return; // already read
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation(); // prevent triggering markAsRead on tap
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getRelativeTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto' }} className="fade-in">
      {/* ── Page Header ────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Notifications Center
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--orange-500)',
                color: 'white',
                fontSize: '0.8rem',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: '700'
              }}>
                {unreadCount} New
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Manage and view system-level alerts, user triggers, and administrative logs.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn btn-outline"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderColor: 'var(--green-400)',
              color: 'var(--green-700)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* ── Notifications List ─────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{
            border: '3px solid rgba(0,0,0,0.1)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            borderLeftColor: 'var(--green-600)',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>!</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>You're all caught up!</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto', fontSize: '0.9rem' }}>
            Any new jobs, incoming user support requests, or payment updates will appear here in real-time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => {
            const isUnread = !notif.is_read;
            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id, notif.is_read)}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: isUnread ? 'pointer' : 'default',
                  borderLeft: isUnread ? '4px solid var(--orange-500)' : '1px solid var(--border)',
                  background: isUnread ? 'rgba(249, 115, 22, 0.02)' : 'var(--card-bg)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Info Block */}
                <div style={{ display: 'flex', gap: '14px', flex: '1' }}>
                  {/* Indicator Dot */}
                  <span style={{
                    fontSize: '1.5rem',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isUnread ? 'var(--green-50)' : 'var(--slate-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: '0'
                  }}>
                    {notif.title.includes('Welcome') ? 'W' : notif.title.includes('Task') ? 'T' : '$'}
                  </span>

                  <div>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: isUnread ? '700' : '600',
                      color: 'var(--text-primary)',
                      lineHeight: '1.4'
                    }}>
                      {notif.title}
                    </h4>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      marginTop: '4px',
                      lineHeight: '1.5'
                    }}>
                      {notif.body}
                    </p>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginTop: '8px',
                      fontWeight: '500'
                    }}>
                      {getRelativeTime(notif.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions Block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isUnread && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--orange-500)'
                    }} />
                  )}
                  <button
                    onClick={(e) => deleteNotification(e, notif.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--red-500)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                    title="Delete Notification"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
