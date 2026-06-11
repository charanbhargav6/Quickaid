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
      // Fetch user role FIRST to prevent overwriting admins
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('id', data.user.id)
        .single();

      if (!profileError && profileData) {
        // Only sync if user is not admin, and we have metadata to sync
        const meta = data?.user?.user_metadata;
        if (profileData.role !== 'admin' && meta) {
          const needsSync = 
            (meta.role && meta.role !== profileData.role) ||
            (meta.full_name && meta.full_name !== profileData.full_name) ||
            (meta.phone && meta.phone !== profileData.phone);
            
          if (needsSync) {
            await supabase.from('profiles').update({
              full_name: meta.full_name || profileData.full_name,
              phone: meta.phone || profileData.phone,
              role: meta.role || profileData.role,
            }).eq('id', data.user.id);
            
            // Update local variable for routing
            profileData.role = meta.role || profileData.role;
          }
        }
      }

      if (profileError) {
        setError('Failed to fetch user profile.');
        setLoading(false);
      } else {
        const role = profileData?.role;
        if (role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          // Both seeker, helper, and both roles default to the seeker dashboard
          // where they can use the Sidebar toggle to switch to helper mode.
          router.push('/seeker');
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setError("Password reset link sent to your email.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} card`}>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>Quick<span className={styles.primaryText}>Aid</span></h1>
        </div>
        
        {error && <div className={styles.errorMessage} style={{ color: error.includes('sent') ? 'green' : 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
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
            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={handleForgotPassword} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                Forgot Password?
              </button>
            </div>
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
