'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HelperSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ full_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name })
      .eq('id', userId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{padding: '24px'}}><div className="skeleton skeleton-box"></div></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Settings</h1>
      
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '1.5rem', marginTop: 0 }}>Personal Information</h2>
        
        {message.text && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? 'var(--green-50)' : 'var(--red-50)',
            color: message.type === 'success' ? 'var(--green-600)' : 'var(--red-600)',
            border: `1px solid ${message.type === 'success' ? 'var(--green-200)' : 'var(--red-200)'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
            <input 
              type="text" 
              value={profile.full_name || ''} 
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '6px', 
                border: '1px solid var(--border)',
                fontSize: '16px'
              }}
              placeholder="Enter your full name"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '0.75rem', fontSize: '16px', marginTop: '1rem' }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
