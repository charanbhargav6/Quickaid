'use client';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/dashboard' },
  { icon: '📋', label: 'My Tasks', path: '/tasks' },
  { icon: '📝', label: 'Post Task', path: '/tasks?action=create' },
  { icon: '📅', label: 'My Bookings', path: '/bookings' },
  { icon: '💰', label: 'Earnings', path: '/earnings' },
  { icon: '💬', label: 'Messages', path: '/messages', badge: 3 },
  { icon: '⭐', label: 'Reviews', path: '/reviews' },
  { icon: '👛', label: 'Wallet', path: '/wallet' },
  { icon: '🔔', label: 'Notifications', path: '/notifications', badge: 2 },
  { divider: true },
  { icon: '❓', label: 'Help & Support', path: '/help' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
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
        {NAV_ITEMS.map((item, i) => {
          if (item.divider) {
            return <div key={i} className={styles.divider} />;
          }
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path?.split('?')[0]));
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => router.push(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </button>
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
          <span>CB</span>
          <div className={styles.onlineDot} />
        </div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>Admin</p>
          <p className={styles.userEmail}>pro171903@gmail.com</p>
          <span className={styles.userStatus}>● Online</span>
        </div>
        <div className={styles.verifiedBadge}>Verified User</div>
      </div>
    </aside>
  );
}
