'use client';
import { useState, useTransition } from 'react';
import { toggleOnlineStatus } from '@/app/helper/_actions/helperActions';

export default function ToggleOnlineStatus({ initialStatus }) {
  const [isOnline, setIsOnline] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    // Optimistic UI update
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    startTransition(async () => {
      const res = await toggleOnlineStatus(!newStatus); // Pass the previous status
      if (!res.success) {
        // Revert on failure
        setIsOnline(!newStatus);
        alert(res.error);
      }
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '14px', fontWeight: 500, opacity: isPending ? 0.7 : 1 }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
        <input 
          type="checkbox" 
          checked={isOnline} 
          onChange={handleToggle} 
          disabled={isPending}
          style={{ opacity: 0, width: 0, height: 0 }} 
        />
        <span style={{ 
          position: 'absolute', cursor: isPending ? 'not-allowed' : 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: isOnline ? 'var(--primary)' : 'var(--slate-300)', 
          transition: '.4s', borderRadius: '24px' 
        }}>
          <span style={{
            position: 'absolute', content: '""', height: '18px', width: '18px', 
            left: isOnline ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', 
            transition: '.4s', borderRadius: '50%'
          }}></span>
        </span>
      </label>
    </div>
  );
}
