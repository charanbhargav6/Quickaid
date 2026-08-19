'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from './Login.module.css';
import Link from 'next/link';
import AlertModal from '@/components/AlertModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in (e.g., after Google OAuth callback)
  useEffect(() => {
    const supabase = createClient();
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/seeker');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/seeker');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAlertModal({ isOpen: true, title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'warning', primaryActionText: 'Ok', onPrimaryAction: () => setAlertModal({ isOpen: false }) });
      return;
    }
    if (password.length < 6) {
      setAlertModal({ isOpen: true, title: 'Password Too Short', message: 'Password must be at least 6 characters.', type: 'warning', primaryActionText: 'Ok', onPrimaryAction: () => setAlertModal({ isOpen: false }) });
      return;
    }

    setLoading(true);
    setAlertModal({ isOpen: false });
    
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setAlertModal({
        isOpen: true,
        title: 'Login Failed',
        message: error.message,
        type: 'danger',
        primaryActionText: 'Ok',
        onPrimaryAction: () => setAlertModal({ isOpen: false })
      });
      setLoading(false);
    } else {
      // Fetch user role FIRST to prevent overwriting admins
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('id', data.user.id)
        .single();

      if (!profileError && profileData) {
        // We no longer sync 'role' from user_metadata to avoid overwriting database role
        const meta = data?.user?.user_metadata;
        if (profileData.role !== 'admin' && meta) {
          const needsSync = 
            (meta.full_name && meta.full_name !== profileData.full_name) ||
            (meta.phone && meta.phone !== profileData.phone);
            
          if (needsSync) {
            await supabase.from('profiles').update({
              full_name: meta.full_name || profileData.full_name,
              phone: meta.phone || profileData.phone,
            }).eq('id', data.user.id);
          }
        }
      }

      if (profileError) {
        setAlertModal({
          isOpen: true,
          title: 'Profile Error',
          message: 'Failed to fetch user profile.',
          type: 'danger',
          primaryActionText: 'Ok',
          onPrimaryAction: () => setAlertModal({ isOpen: false })
        });
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
      setAlertModal({
        isOpen: true,
        title: 'Email Required',
        message: 'Please enter your email address first.',
        type: 'warning',
        primaryActionText: 'Ok',
        onPrimaryAction: () => setAlertModal({ isOpen: false })
      });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setAlertModal({
        isOpen: true,
        title: 'Reset Failed',
        message: error.message,
        type: 'danger',
        primaryActionText: 'Ok',
        onPrimaryAction: () => setAlertModal({ isOpen: false })
      });
    } else {
      setAlertModal({
        isOpen: true,
        title: 'OTP Sent',
        message: 'Check your email for the 6-digit OTP.',
        type: 'success',
        primaryActionText: 'Ok',
        onPrimaryAction: () => {
          setAlertModal({ isOpen: false });
          window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
        }
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });
    if (error) {
      setAlertModal({
        isOpen: true,
        title: 'Login Failed',
        message: error.message,
        type: 'danger',
        primaryActionText: 'Ok',
        onPrimaryAction: () => setAlertModal({ isOpen: false })
      });
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} card`} style={{ maxWidth: '420px', width: '90%' }}>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>Quick<span className={styles.primaryText}>Aid</span></h1>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1e293b' }}>Welcome Back</h2>
        
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
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' 
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
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

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#94a3b8', fontSize: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          <span style={{ padding: '0 10px' }}>Or continue with</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
            color: '#1e293b',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseOut={e => e.currentTarget.style.background = 'white'}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>
      
      <AlertModal {...alertModal} />
    </div>
  );
}
