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
  const router = useRouter();

  const handleReset = async (e) => {
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
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
          Enter the 6-digit OTP sent to <strong>{email}</strong> and your new password.
        </p>
        <form onSubmit={handleReset}>
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="6-digit OTP" 
            maxLength={6}
            required 
            className="input" 
            style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }} 
          />
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="New Password" 
            required 
            className="input" 
            style={{ width: '100%', marginBottom: '1rem' }} 
          />
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            placeholder="Confirm New Password" 
            required 
            className="input" 
            style={{ width: '100%', marginBottom: '1.5rem' }} 
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        {error && <p style={{ marginTop: '1rem', color: 'red', fontSize: '14px' }}>{error}</p>}
        {message && <p style={{ marginTop: '1rem', color: 'green', fontSize: '14px' }}>{message}</p>}
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
