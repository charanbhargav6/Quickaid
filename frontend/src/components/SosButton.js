'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase';

export default function SosButton({ taskId }) {
  const [loading, setLoading] = useState(false);

  const handleSos = async () => {
    if (!confirm("Are you sure you want to trigger an SOS alert? This will immediately notify the admin team.")) {
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    // We can use the tasks table to find seeker/helper if needed, 
    // or just insert a notification to the admin directly.
    const { error } = await supabase.from('notifications').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // A placeholder or actual admin ID
      title: '🚨 EMERGENCY SOS 🚨',
      body: `SOS triggered in task chat for Task ID: ${taskId}`,
      data: { type: 'sos', taskId }
    });

    // We can also insert an SOS message into the chat room itself
    await supabase.from('messages').insert({
      task_id: taskId,
      content: '🚨 USER HAS TRIGGERED AN SOS ALERT 🚨',
    });

    setLoading(false);
    
    if (error) {
      toast.error("Failed to trigger SOS alert. Please call emergency services if you are in danger.");
    } else {
      toast.success("SOS Alert Sent! The admin team has been notified.", {
        style: {
          border: '1px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
          fontWeight: 'bold'
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#FFFAEE',
        },
      });
    }
  };

  return (
    <button
      onClick={handleSos}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        padding: '8px 16px',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#ef4444';
        e.currentTarget.style.color = '#ffffff';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
        e.currentTarget.style.color = '#ef4444';
      }}
    >
      <span style={{ fontSize: '18px', lineHeight: 1 }}>🆘</span>
      {loading ? 'SENDING...' : 'SOS'}
    </button>
  );
}
