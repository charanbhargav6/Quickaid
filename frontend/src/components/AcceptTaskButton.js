'use client';
import { useTransition } from 'react';
import { acceptTask } from '@/app/helper/_actions/helperActions';

export default function AcceptTaskButton({ taskId, onSuccess }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const res = await acceptTask({ taskId });
      if (!res.success) {
        alert(res.error);
      } else if (onSuccess) {
        onSuccess();
      }
    });
  };

  return (
    <button 
      className="btn btn-primary" 
      style={{ padding: '6px 12px', fontSize: '12px' }} 
      onClick={handleAccept}
      disabled={isPending}
    >
      {isPending ? 'Accepting...' : 'Accept Task'}
    </button>
  );
}
