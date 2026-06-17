'use client';
import Sidebar from '@/components/Sidebar';

export default function SupportFAQ() {
  return (
    <div className="app-container">
      <Sidebar role="seeker" />
      <div className="main-content">
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Support & FAQ</h1>
          
          <section style={{ marginBottom: '3rem' }}>
            <h2>Frequently Asked Questions</h2>
            
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>How do I pay a Helper?</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Currently, all payments are handled directly between the Seeker and the Helper. Once the task is completed, you can pay using UPI, cash, or any mutually agreed method.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>How does the Trust Score work?</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Your Trust Score is calculated based on your task completion rate and the reviews you receive from other users. Maintaining a high score ensures you get picked for more tasks!</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>What if I feel unsafe?</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Safety is our top priority. You can use the SOS button inside the chat screen to immediately alert local authorities. You can also report and block any user who violates our guidelines.</p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Can I cancel a task?</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Yes, but frequent cancellations will negatively impact your Trust Score. Please only accept or post tasks you intend to follow through with.</p>
            </div>
          </section>

          <section className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Still need help?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Our support team is here for you.</p>
            <a href="mailto:support@quickaid.com" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Email Support
            </a>
          </section>

        </div>
      </div>
    </div>
  );
}
