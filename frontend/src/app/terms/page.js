export const metadata = {
  title: 'Terms of Service | QuickAid',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>Terms of Service</h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Last updated: May 2026</p>
      
      <div style={{ lineHeight: '1.6', color: '#334155' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
        <p style={{ marginBottom: '16px' }}>
          By accessing and using the QuickAid platform ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>2. User Roles & Responsibilities</h2>
        <p style={{ marginBottom: '16px' }}>
          <strong>Seekers:</strong> You agree to provide accurate descriptions of tasks and ensure you have sufficient funds in your wallet to cover the agreed payment before posting a task.
        </p>
        <p style={{ marginBottom: '16px' }}>
          <strong>Helpers:</strong> You agree to perform accepted tasks to the best of your ability, maintain professional conduct, and accurately report task completion.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>3. Payments and Wallet</h2>
        <p style={{ marginBottom: '16px' }}>
          QuickAid utilizes a secure digital wallet system. Funds are held in escrow once a task is accepted and are transferred to the Helper upon mutual confirmation of task completion. QuickAid is not responsible for disputes regarding task quality, though our Trust Score system helps mitigate such issues.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>4. Account Suspension</h2>
        <p style={{ marginBottom: '16px' }}>
          QuickAid administrators reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or maintain consistently poor Trust Scores.
        </p>
      </div>
      
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <a href="/" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Home</a>
      </div>
    </div>
  );
}
