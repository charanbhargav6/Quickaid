'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AvatarUpload({ profile, isOwner }) {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef(null);
  const supabase = createClient();

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to supabase storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      router.refresh();
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)' }}>
          {profile.full_name ? profile.full_name[0] : 'U'}
        </span>
      )}
      
      {isOwner && (
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '8px', textAlign: 'center', cursor: 'pointer', opacity: uploading ? 0.5 : 0.8, fontSize: '13px', fontWeight: 'bold', transition: '0.2s ease' }}
          className="hover:opacity-100"
        >
          {uploading ? '...' : 'UPLOAD'}
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />
    </div>
  );
}
