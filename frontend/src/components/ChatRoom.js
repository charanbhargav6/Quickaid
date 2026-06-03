'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

export default function ChatRoom({ initialMessages, taskId, userId, taskStatus }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to realtime messages for this specific task
    const channel = supabase
      .channel(`chat_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          // Add new message if it wasn't sent by us (we already optimistically add ours)
          if (payload.new.sender_id !== userId) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, userId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistically add to UI
    const optimisticMessage = {
      id: Math.random().toString(),
      content,
      sender_id: userId,
      created_at: new Date().toISOString(),
      task_id: taskId
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    const supabase = createClient();
    const { error } = await supabase.from('messages').insert([
      {
        task_id: taskId,
        sender_id: userId,
        content: content
      }
    ]);

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
    } else {
      // Send notification to recipient
      const { data: task } = await supabase.from('tasks').select('seeker_id, helper_id').eq('id', taskId).single();
      if (task) {
        const recipientId = task.seeker_id === userId ? task.helper_id : task.seeker_id;
        if (recipientId) {
          await supabase.from('notifications').insert({
            user_id: recipientId,
            title: 'New Message 💬',
            message: `You have a new message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
            type: 'message',
            link: `/chat/${taskId}`
          });
        }
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f2f5' }}>
      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: isMe ? 'var(--primary)' : '#fff',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: '0.95rem',
                  lineHeight: '1.4'
                }}
              >
                {!isMe && msg.profiles?.full_name && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                    {msg.profiles.full_name}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                <div style={{ 
                  fontSize: '10px', 
                  color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', 
                  textAlign: 'right',
                  marginTop: '4px'
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', background: '#fff', borderTop: '1px solid var(--border)' }}>
        {taskStatus === 'accepted' ? (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="input"
              style={{ flex: 1, borderRadius: '24px', padding: '12px 20px' }}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={!newMessage.trim() || loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px 0' }}>
            Chat is closed. This task is {taskStatus}.
          </div>
        )}
      </div>
    </div>
  );
}
