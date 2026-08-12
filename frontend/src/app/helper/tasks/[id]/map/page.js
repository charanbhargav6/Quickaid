'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the map component so it doesn't break SSR
const TaskTrackerMap = dynamic(() => import('./TaskTrackerMap'), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ height: 'calc(100vh - 200px)', borderRadius: '16px' }}>
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Live Map...</div>
    </div>
  )
});

export default function LiveTaskMapPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id;
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        seeker:seeker_id(full_name, phone)
      `)
      .eq('id', taskId)
      .single();

    if (error || !data) {
      console.error(error);
      router.push('/helper/tasks');
      return;
    }
    
    setTask(data);
    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}><div className="skeleton skeleton-box" style={{height: '100px'}}></div></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Link href="/helper/tasks" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
              ← Back to Tasks
            </Link>
            <span className="badge badge-blue" style={{ textTransform: 'uppercase' }}>{task.status}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{task.title}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{(task.pay ?? task.price)?.toFixed(2)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Seeker: {task.seeker?.full_name || 'Unknown'} ({task.seeker?.phone || 'No phone'})</div>
        </div>
      </header>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <TaskTrackerMap task={task} />
      </div>
    </div>
  );
}
