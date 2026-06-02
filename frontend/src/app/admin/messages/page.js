'use client';

export default function MessagesPage() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>System Messages & Support</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Monitor automated system alerts and user support chats.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>💬</span>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Active Support Messages</h3>
        <p>User chat moderation and support ticketing will appear here.</p>
      </div>
    </div>
  );
}
