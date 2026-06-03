'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Sidebar.module.css';
import { createClient } from '@/lib/supabase';

import { useState, useEffect } from 'react';

const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: '👥', label: 'Users', path: '/admin/users' },
  { icon: '📋', label: 'Tasks', path: '/admin/tasks' },
  { icon: '📝', label: 'Post Task', path: '/admin/tasks?action=create' },
  { icon: '📅', label: 'My Bookings', path: '/admin/bookings' },
  { icon: '💰', label: 'Earnings', path: '/admin/earnings' },
  { icon: '💬', label: 'Messages', path: '/admin/messages' },
  { icon: '⭐', label: 'Reviews', path: '/admin/reviews' },
  { icon: '👛', label: 'Wallet', path: '/admin/wallet' },
  { icon: '🔔', label: 'Notifications', path: '/admin/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/admin/help' },
  { icon: '⚙️', label: 'Settings', path: '/admin/settings' },
];

const SEEKER_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/seeker' },
  { icon: '📝', label: 'Post Task', path: '/seeker?action=create' },
  { icon: '🔔', label: 'Notifications', path: '/seeker/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/seeker/help' },
  { icon: '⚙️', label: 'Settings', path: '/seeker/settings' },
];

const HELPER_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/helper' },
  { icon: '📋', label: 'My Tasks', path: '/helper/tasks' },
  { icon: '💰', label: 'Earnings', path: '/helper/earnings' },
  { icon: '🔔', label: 'Notifications', path: '/helper/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/helper/help' },
  { icon: '⚙️', label: 'Settings', path: '/helper/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [role, setRole] = useState('admin');
  const [profile, setProfile] = useState(null);

  const fetchUnreadCount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) {
        setRole(prof.role || 'admin');
        setProfile(prof);
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to realtime database changes for notifications
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-notifications-sidebar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={styles.sidebar}>
      {/* ── Brand ──────────────────── */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <span>⚡</span>
        </div>
        <div>
          <h1 className={styles.brandName}>QuickAid</h1>
        </div>
      </div>

      {/* ── Navigation ─────────────── */}
      <nav className={styles.nav}>
        {(role === 'seeker' ? SEEKER_NAV : role === 'helper' ? HELPER_NAV : ADMIN_NAV).map((item, i) => {
          if (item.divider) {
            return <div key={i} className={styles.divider} />;
          }
          const isActive = pathname === item.path || (item.path !== '/admin/dashboard' && item.path !== '/seeker' && item.path !== '/helper' && pathname?.startsWith(item.path?.split('?')[0]));
          const displayBadge = item.label === 'Notifications' ? unreadCount : item.badge;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {displayBadge > 0 && (
                <span className={styles.navBadge}>{displayBadge}</span>
              )}
            </Link>
          );
        })}

        {/* Logout */}
        <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
          <span className={styles.navIcon}>🚪</span>
          <span className={styles.navLabel}>Logout</span>
        </button>
      </nav>

      {/* ── User Profile Card ──────── */}
      <div className={styles.userCard}>
        <div className={styles.userAvatar}>
          <span>{profile?.full_name ? profile.full_name[0] : 'U'}</span>
          <div className={styles.onlineDot} />
        </div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{profile?.full_name || 'User'}</p>
          <p className={styles.userEmail}>{role.toUpperCase()}</p>
          <span className={styles.userStatus}>● Online</span>
        </div>
        <div className={styles.verifiedBadge}>Verified User</div>
      </div>
    </aside>
  );
}
