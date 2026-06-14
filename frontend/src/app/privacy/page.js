'use client';
import Sidebar from '@/components/Sidebar';
import styles from '../seeker/Seeker.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles.layout}>
      <Sidebar role="seeker" />
      <div className={styles.mainContent}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Privacy Policy</h1>
          
          <section style={{ marginBottom: '2rem' }}>
            <h2>1. Information We Collect</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We collect information you provide directly to us when you register, including your name, email address, and phone number. We also collect your location data (GPS coordinates) when you actively use the app to find nearby tasks or broadcast your availability.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>2. How We Use Your Information</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We use your information to facilitate connections between Seekers and Helpers, compute distances for nearby tasks, verify your identity, and maintain our Trust Score system. Your precise location is only shared when you accept a task or request help.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>3. Information Sharing</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We do not sell your personal data. We share your profile information (Name, Trust Score, and completed task count) with other users to build trust. Contact information is only unlocked and shared between parties after a task is mutually accepted.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>4. Data Security</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We implement industry-standard security measures to protect your personal information. Chat messages are securely stored in our databases to provide dispute resolution if necessary.
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
