'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from './Login.module.css';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Fetch user role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        setError('Failed to fetch user profile.');
        setLoading(false);
      } else {
        const role = profileData?.role;
        if (role === 'admin') {
          router.push('/admin/dashboard');
        } else if (role === 'seeker') {
          router.push('/seeker');
        } else if (role === 'helper') {
          router.push('/helper');
        } else {
          router.push('/dashboard');
        }
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} card`}>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>Quick<span className={styles.primaryText}>Aid</span></h1>
        </div>
        
        {error && <div className={styles.errorMessage} style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              className="input" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={`btn btn-primary ${styles.loginBtn}`} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
