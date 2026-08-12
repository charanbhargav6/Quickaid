'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';
import { createClient } from '@/lib/supabase';
import { useNotifications } from '@/components/NotificationProvider';



const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: '👥', label: 'Users', path: '/admin/users' },
  { icon: '📋', label: 'Tasks', path: '/admin/tasks' },
  { icon: '💬', label: 'Messages', path: '/chat' },
  { icon: '⭐', label: 'Reviews', path: '/admin/reviews' },
  { icon: '🚩', label: 'Reports', path: '/admin/reports' },
  { icon: '💸', label: 'Process Payout', path: '/admin/wallet' },
  { icon: '👛', label: 'My Wallet', path: '/admin/my-wallet' },
  { icon: '🔔', label: 'Notifications', path: '/admin/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/support' },
  { icon: '📄', label: 'Terms & Conditions', path: '/terms' },
  { icon: '🔒', label: 'Privacy Policy', path: '/privacy' },
  { icon: '⚙️', label: 'Settings', path: '/admin/settings' },
];

const SEEKER_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/seeker' },
  { icon: '📝', label: 'Post Task', path: '/seeker?action=create' },
  { icon: '💬', label: 'Messages', path: '/chat' },
  { icon: '👛', label: 'Wallet', path: '/seeker/wallet' },
  { icon: '🔔', label: 'Notifications', path: '/seeker/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/support' },
  { icon: '📄', label: 'Terms & Conditions', path: '/terms' },
  { icon: '🔒', label: 'Privacy Policy', path: '/privacy' },
  { icon: '⚙️', label: 'Settings', path: '/seeker/settings' },
];

const HELPER_NAV = [
  { icon: '📊', label: 'Dashboard', path: '/helper' },
  { icon: '🗺️', label: 'Live Map', path: '/helper/map' },
  { icon: '📋', label: 'My Tasks', path: '/helper/tasks' },
  { icon: '💰', label: 'Earnings', path: '/helper/earnings' },
  { icon: '💬', label: 'Messages', path: '/chat' },
  { icon: '🔔', label: 'Notifications', path: '/helper/notifications' },
  { icon: '📱', label: 'Get the App', path: '/download' },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/support' },
  { icon: '📄', label: 'Terms & Conditions', path: '/terms' },
  { icon: '🔒', label: 'Privacy Policy', path: '/privacy' },
  { icon: '⚙️', label: 'Settings', path: '/helper/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { unreadCount } = useNotifications();
  const [role, setRole] = useState('seeker');
  const [profile, setProfile] = useState(null);

  // Determine current mode from URL
  const currentMode = pathname?.startsWith('/helper') ? 'helper' : 'seeker';

  const fetchUnreadCount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) {
        setRole(prof.role || 'seeker');
        setProfile(prof);
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

  const handleToggleMode = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (currentMode === 'seeker') {
      if (role === 'seeker') {
        if (window.confirm('Would you like to upgrade your account to become a Helper as well?')) {
          await supabase.from('profiles').update({ role: 'both' }).eq('id', user.id);
          setRole('both');
          startTransition(() => router.push('/helper'));
        }
        return;
      }
      startTransition(() => router.push('/helper'));
    } else {
      startTransition(() => router.push('/seeker'));
    }
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

      {/* ── Mode Toggle ────────────── */}
      {role !== 'admin' && (
        <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <div 
            onClick={handleToggleMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-secondary)',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>
                {currentMode === 'seeker' ? '👀' : '🤝'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Current Mode
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {currentMode === 'seeker' ? 'Seeker' : 'Helper'}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '20px', color: 'var(--primary)' }}>⇄</span>
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────── */}
      <nav className={styles.nav}>
        {(role === 'admin' ? ADMIN_NAV : currentMode === 'helper' ? HELPER_NAV : SEEKER_NAV).map((item, i) => {
          if (item.divider) {
            return <div key={i} className={styles.divider} />;
          }
          
          return (
            <Link 
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path || (item.path !== '/seeker' && item.path !== '/helper' && pathname.startsWith(item.path)) ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className={styles.navBadge}>{unreadCount}</span>
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
      <Link href={`/profile/${profile?.id}`} className={styles.userCard} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className={styles.userAvatar}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span>{profile?.full_name ? profile.full_name[0] : 'U'}</span>
          )}
          <div className={styles.onlineDot} />
        </div>
        <div className={styles.userInfo}>
          <p className={styles.userName} style={{ margin: 0, fontWeight: 'bold' }}>{profile?.full_name || 'User'}</p>
          <p className={styles.userEmail} style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>{role === 'admin' ? 'ADMIN' : 'USER'}</p>
          <span className={styles.userStatus} style={{ fontSize: '0.75rem', color: 'var(--green-500)' }}>● Online</span>
        </div>
        {role !== 'admin' && <div className={styles.verifiedBadge} style={{ fontSize: '0.7rem' }}>Verified</div>}
      </Link>
    </aside>
  );
}
