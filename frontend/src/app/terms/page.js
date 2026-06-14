'use client';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import styles from '../seeker/Seeker.module.css';

export default function TermsAndConditions() {
  return (
    <div className={styles.layout}>
      <Sidebar role="seeker" />
      <div className={styles.mainContent}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Terms and Conditions</h1>
          
          <section style={{ marginBottom: '2rem' }}>
            <h2>1. Introduction</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Welcome to QuickAid (also referred to as LocalHelper). By using our platform, you agree to be bound by these Terms and Conditions. QuickAid is a hyperlocal platform connecting nearby individuals for short-duration physical assistance tasks.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>2. User Roles and Responsibilities</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Users can act as both Task Seekers and Helpers. You agree to provide accurate information, maintain the security of your account, and conduct yourself professionally and safely during all interactions. QuickAid is not an employer, and Helpers act as independent contractors.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>3. Permitted Tasks</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              The platform is intended for physical nearby assistance (e.g., carrying luggage, grocery help, queue standing). The following tasks are strictly prohibited: harassment-related requests, illegal deliveries, academic cheating, unsafe transportation, and any activity violating local laws.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>4. Payments and Liability</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Currently, all payments are handled externally directly between the Seeker and the Helper (e.g., via UPI or cash). QuickAid is not responsible for payment disputes, uncompleted tasks, or any damages, injuries, or losses incurred during a task.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>5. Trust and Safety</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We utilize a Trust Score system based on user reviews and completion rates. QuickAid reserves the right to suspend or ban users who violate our community guidelines, receive multiple negative reviews, or engage in suspicious behavior.
            </p>
          </section>

          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '3rem' }}>
            Last updated: June 2026
          </p>
        </div>
      </div>
    </div>
  );
}
