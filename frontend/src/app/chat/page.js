import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function ChatHubPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch tasks where this user is either the seeker or helper, AND the task is accepted or completed
  const { data: conversations } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      seeker_id,
      helper_id,
      created_at
    `)
    .or(`seeker_id.eq.${user.id},helper_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  // For each conversation, we want to fetch the "other" person's profile info
  const enrichedConversations = await Promise.all((conversations || []).map(async (task) => {
    const isSeeker = task.seeker_id === user.id;
    const otherUserId = isSeeker ? task.helper_id : task.seeker_id;
    
    let otherUser = { full_name: 'Unknown', role: 'User' };
    if (otherUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', otherUserId)
        .single();
      if (profile) otherUser = profile;
    }

    return { ...task, otherUser, isSeeker };
  }));

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Messages</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Chat with the people involved in your active tasks.</p>
      </header>

      {enrichedConversations.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>💬</span>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Active Conversations</h3>
          <p>You can start chatting once a task has been accepted!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {enrichedConversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`} style={{ textDecoration: 'none' }}>
              <div className="card fade-in" style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '50%', 
                    background: 'var(--primary-light)', color: 'var(--primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '20px', fontWeight: 'bold' 
                  }}>
                    {conv.otherUser.full_name[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                      {conv.otherUser.full_name}
                      <span className={`badge ${conv.otherUser.role === 'helper' ? 'badge-blue' : 'badge-green'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
                        {conv.otherUser.role.toUpperCase()}
                      </span>
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Task: <strong>{conv.title}</strong>
                    </p>
                  </div>
                </div>
                <div>
                  <span className={`badge ${conv.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                    {conv.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
