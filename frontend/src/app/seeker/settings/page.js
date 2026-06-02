'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
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
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (error) {
      setMessage('Error updating profile');
    } else {
      setMessage('Profile updated successfully');
    }
    setSaving(false);
  };

  if (loading) return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;

  return (
    <>
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px' }}>Settings</h1>
      </header>
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Full Name</label>
              <input 
                type="text" 
                className="input" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {message && <span style={{ color: message.includes('Error') ? 'var(--red-500)' : 'var(--green-600)', fontSize: '14px' }}>{message}</span>}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
