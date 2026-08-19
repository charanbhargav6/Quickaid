'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './NotificationToast.module.css';
import { deleteNotificationServer } from '@/app/_actions/notificationActions';

const NotificationContext = createContext({ notifications: [], unreadCount: 0, markAsRead: () => {}, deleteNotification: () => {} });

export function useNotifications() {
  return useContext(NotificationContext);
}

export default function NotificationProvider({ children }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // 1. Get current user
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      
      // 2. Fetch existing unread notifications
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // 3. Subscribe to real-time inserts
    const channel = supabase.channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new;
          
          // Update lists
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Trigger toast
          addToast(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const addToast = (notif) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...notif, _toastId: id }]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t._toastId !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t._toastId !== id));
  };

  const markAsRead = async (id) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const deleteNotification = async (id) => {
    // Optimistic UI update
    setNotifications(prev => {
      const notif = prev.find(n => n.id === id);
      if (notif && !notif.is_read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== id);
    });

    // Delete from database using server action (bypasses RLS)
    const { error } = await deleteNotificationServer(id);
    if (error) {
      console.error('Failed to delete notification:', error);
      // Optional: Could revert optimistic update here if needed
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, deleteNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast._toastId} className={`${styles.toast} ${styles.slideIn}`} onClick={() => {
            if (toast.link) router.push(toast.link);
            removeToast(toast._toastId);
            markAsRead(toast.id);
          }}>
            <div className={styles.toastIcon}>
              {toast.type === 'message' ? '💬' : toast.type === 'task_accepted' ? '🤝' : toast.type === 'task_completed' ? '✅' : '🔔'}
            </div>
            <div className={styles.toastContent}>
              <h4 className={styles.toastTitle}>{toast.title}</h4>
              <p className={styles.toastMessage}>{toast.message}</p>
            </div>
            <button className={styles.toastClose} onClick={(e) => { e.stopPropagation(); removeToast(toast._toastId); }}>&times;</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
