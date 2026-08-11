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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Password Validation Rules
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;
  const isPasswordValid = hasUppercase && hasNumber && hasMinLength;

  // Calculate Strength Bar
  let strength = 0;
  if (password.length > 0) strength += 1; // Weak
  if (hasUppercase || hasNumber) strength += 1; // Moderate
  if (isPasswordValid) strength += 1; // Strong

  const getStrengthColor = () => {
    if (strength === 1) return '#EF4444'; // Red
    if (strength === 2) return '#F59E0B'; // Orange
    if (strength === 3) return '#10B981'; // Green
    return '#E2E8F0'; // Gray
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please meet all password requirements before signing up.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

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
      setError(error.message);
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
            <label>Password *</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Confirm Password *</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Dynamic Password Validation UI */}
          <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: strength >= 1 ? getStrengthColor() : '#E2E8F0', transition: 'background 0.3s' }}></div>
              <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: strength >= 2 ? getStrengthColor() : '#E2E8F0', transition: 'background 0.3s' }}></div>
              <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: strength >= 3 ? getStrengthColor() : '#E2E8F0', transition: 'background 0.3s' }}></div>
            </div>
            
            <div style={{ marginBottom: '6px' }}>Password must contain at least:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: hasUppercase ? '#10B981' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasUppercase ? '✅' : '⚪'} At least 1 uppercase letter
              </div>
              <div style={{ color: hasNumber ? '#10B981' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasNumber ? '✅' : '⚪'} At least 1 number
              </div>
              <div style={{ color: hasMinLength ? '#10B981' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasMinLength ? '✅' : '⚪'} At least 8 characters
              </div>
            </div>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.loginBtn}`} disabled={loading || !isPasswordValid || password !== confirmPassword} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
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
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
