'use client';
import { useState } from 'react';
import { acceptTask } from '@/app/helper/_actions/helperActions';
import toast from 'react-hot-toast';

export default function AcceptTaskButton({ taskId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await acceptTask({ taskId });
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success('Task accepted successfully!');
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="btn btn-primary" 
      style={{ padding: '6px 12px', fontSize: '12px' }} 
      onClick={handleAccept}
      disabled={loading}
    >
      {loading ? 'Accepting...' : 'Accept Task'}
    </button>
  );
}
