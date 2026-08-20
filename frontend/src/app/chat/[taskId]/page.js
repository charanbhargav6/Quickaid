import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ChatRoom from '@/components/ChatRoom';
import SosButton from '@/components/SosButton';

export default async function ChatPage({ params }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify task exists and user is part of it
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      seeker_id,
      helper_id
    `)
    .eq('id', taskId)
    .single();

  if (error || !task) {
    return <div style={{ padding: '2rem' }}>Error loading task: {error?.message || 'Task not found'}</div>;
  }

  const isSeeker = task.seeker_id === user.id;
  const isHelper = task.helper_id === user.id;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin';

  if (!isSeeker && !isHelper && !isAdmin) {
    return <div style={{ padding: '2rem' }}>Error: You do not have permission to view this chat. isSeeker: {isSeeker.toString()}, isHelper: {isHelper.toString()}, isAdmin: {isAdmin?.toString()}</div>;
  }

  // Find the other user's name
  const otherUserId = isSeeker ? task.helper_id : task.seeker_id;
  let otherUserName = 'Unknown User';
  
  if (otherUserId) {
    const { data: otherProfile } = await supabase.from('profiles').select('full_name').eq('id', otherUserId).single();
    if (otherProfile) otherUserName = otherProfile.full_name;
  }

  // Fetch initial messages
  const { data: initialMessages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      sender_id,
      profiles:sender_id(full_name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  return (
    <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="/chat" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>←</a>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{otherUserName}</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Task: {task.title}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SosButton taskId={taskId} />
        </div>
      </header>
      
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f8fafc' }}>
        <ChatRoom 
          initialMessages={initialMessages || []} 
          taskId={taskId} 
          userId={user.id} 
          taskStatus={task.status}
        />
      </div>
    </div>
  );
}
