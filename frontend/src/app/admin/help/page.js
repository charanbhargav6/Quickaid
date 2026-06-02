'use client';

export default function HelpPage() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Help & Documentation</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Admin guides, FAQs, and platform settings documentation.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Trust Engine Docs</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            The QuickAid Trust Engine automatically adjusts user scores. Completions grant +2 points. Cancellations deduct -5 points. User reports deduct -10 points. If a user drops below 50, their account is flagged for review.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Managing Payouts</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Payouts are processed manually in the Test Phase. Visit the Wallet page to view accrued balances. Mark as "Processed" once transferred via UPI or bank transfer.
          </p>
        </div>
      </div>
    </div>
  );
}
