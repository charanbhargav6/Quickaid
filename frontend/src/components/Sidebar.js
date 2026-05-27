'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Users', path: '/users', icon: '👥' },
  { name: 'Tasks', path: '/tasks', icon: '📝' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={`${styles.sidebar} glass-panel`}>
      <div className={styles.logoContainer}>
        <span className={styles.logoIcon}>⚡</span>
        <h1 className={styles.logoText}>Quick<span className={styles.orangeText}>Aid</span></h1>
      </div>
      
      <nav className={styles.navMenu}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              href={item.path} 
              key={item.name}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottomSection}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.icon}>🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
