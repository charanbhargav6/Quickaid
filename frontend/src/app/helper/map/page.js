'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { acceptTask } from '@/app/helper/_actions/helperActions';
import { useRouter } from 'next/navigation';

const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 'calc(100vh - 150px)', borderRadius: '16px' }}></div> });

export default function MapPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .not('lat', 'is', null)
      .not('lng', 'is', null);
      
    if (data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    
    // Subscribe to real-time changes so pins appear instantly
    const channel = supabase.channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAcceptTask = async (taskId) => {
    const res = await acceptTask(taskId);
    if (res.success) {
      alert("Task accepted! Redirecting to My Tasks...");
      router.push('/helper/tasks');
    } else {
      alert(res.error || "Failed to accept task.");
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Live Task Map 🗺️</h1>
          <p style={{ color: 'var(--text-muted)' }}>Find open tasks near your location and accept them instantly.</p>
        </div>
        <div style={{ background: 'var(--blue-50)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'var(--primary)', fontWeight: 600 }}>
          {tasks.length} Open Tasks
        </div>
      </header>
      
      <LiveMap tasks={tasks} onAccept={handleAcceptTask} />
    </div>
  );
}
