'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    const supabase = createClient();

    // Verify OTP first
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery'
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }
    
    setOtpVerified(true);
    setMessage('OTP Verified! Please enter your new password.');
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    const supabase = createClient();
    
    // Then update password
    const { error: updateError } = await supabase.auth.updateUser({ password: password });
    
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated successfully! Redirecting...");
      setTimeout(() => router.push('/login'), 2000);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Reset Password</h2>
        
        {!otpVerified ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
              Enter the 6-digit OTP sent to <strong>{email}</strong>.
            </p>
            <form onSubmit={handleVerifyOtp}>
              <input 
                type="text" 
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                placeholder="6-digit OTP" 
                maxLength={6}
                required 
                className="input" 
                style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }} 
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
              Enter your new password below.
            </p>
            <form onSubmit={handleUpdatePassword}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="New Password" 
                  required 
                  className="input" 
                  style={{ width: '100%', paddingRight: '46px' }} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm New Password" 
                  required 
                  className="input" 
                  style={{ width: '100%', paddingRight: '46px' }} 
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
        
        {error && (
          <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', textAlign: 'left', lineHeight: '1.5' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px', textAlign: 'left', lineHeight: '1.5' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
