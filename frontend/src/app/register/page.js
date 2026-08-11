'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from '../login/Login.module.css';
import Link from 'next/link';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: 'both',
        }
      }
    });
    
    if (authError) {
      // Clean up Supabase's ugly password complexity error message
      let errorMessage = authError.message;
      if (errorMessage.includes("Password should contain at least one character of each")) {
        errorMessage = "Password must contain at least 8 characters, including a lowercase letter (a-z), an uppercase letter (A-Z), a number (0-9), and a special character.";
      }
      setError(errorMessage);
      setLoading(false);
      return;
    }

    if (data?.user) {
      // Check for Email Enumeration Protection masking existing email
      if (data.user.identities && data.user.identities.length === 0) {
        setError('This email address is already registered. Please sign in.');
        setLoading(false);
        return;
      }
      router.push('/login?registered=true');
    } else {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} card`}>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>Quick<span className={styles.primaryText}>Aid</span></h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Create an account to get started</p>
        
        {error && <div className={styles.errorMessage} style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Full Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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
            <label>Phone (Optional)</label>
            <input 
              type="tel" 
              className="input" 
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              minLength={8}
            />
          </div>



          <button type="submit" className={`btn btn-primary ${styles.loginBtn}`} disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
