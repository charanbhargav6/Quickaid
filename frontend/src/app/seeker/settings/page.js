'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SeekerSettings() {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState(null);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.body.classList.contains('dark-theme') || localStorage.getItem('theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    }
    setLoading(false);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMsg({ type: '', text: '' });

    if (password) {
      if (password !== confirmPassword) {
        setMsg({ type: 'error', text: 'Passwords do not match.' });
        setSaving(false);
        return;
      }
      const { error: passError } = await supabase.auth.updateUser({
        password: password
      });
      if (passError) {
        setMsg({ type: 'error', text: passError.message });
        setSaving(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone })
      .eq('id', user.id);

    if (profileError) {
      setMsg({ type: 'error', text: 'Error updating profile' });
    } else {
      setMsg({ type: 'success', text: 'Settings updated successfully.' });
      setPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  if (loading) return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your profile and preferences.</p>
        </div>
      </header>
      
      {msg.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: msg.type === 'error' ? 'var(--red-500)' : 'var(--green-500)',
          color: 'white',
          fontWeight: 500,
          opacity: 0.9
        }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Profile Section */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            Profile Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Username (Full Name)</label>
              <input 
                type="text" 
                className="input" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Phone Number</label>
              <input 
                type="tel" 
                className="input" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Email Address</label>
              <input 
                type="text" 
                className="input" 
                value={user?.email || ''}
                disabled
                style={{ background: 'var(--slate-100)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Appearance Theme</label>
              <select 
                className="input" 
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--slate-50)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Email Alerts</strong>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Receive important system updates</span>
              </div>
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            Security
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>New Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Leave blank to keep current" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Confirm New Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Leave blank to keep current" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ paddingBottom: '40px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 24px', fontSize: '16px' }}>
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
