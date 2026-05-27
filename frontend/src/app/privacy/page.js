export const metadata = {
  title: 'Privacy Policy | QuickAid',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Last updated: May 2026</p>
      
      <div style={{ lineHeight: '1.6', color: '#334155' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>1. Information We Collect</h2>
        <p style={{ marginBottom: '16px' }}>
          When you register for QuickAid, we collect your name, email address, phone number (optional), and your chosen role (Seeker/Helper/Both). We also collect precise location data when you post tasks using our interactive map feature.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>2. How We Use Your Information</h2>
        <p style={{ marginBottom: '16px' }}>
          Your information is used to facilitate the connection between Seekers and Helpers. Your name and Trust Score are visible to other users to maintain platform safety. Location data is strictly used to display tasks on the map to nearby Helpers.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>3. Data Security</h2>
        <p style={{ marginBottom: '16px' }}>
          We implement row-level security (RLS) policies through Supabase to ensure that your private data (such as wallet balances and direct messages) is only accessible to you and authorized parties (e.g., the specific Helper assigned to your task).
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>4. Contact Us</h2>
        <p style={{ marginBottom: '16px' }}>
          If you have any questions about this Privacy Policy or wish to request data deletion, please contact our administrative team through the QuickAid platform.
        </p>
      </div>
      
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <a href="/" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Home</a>
      </div>
    </div>
  );
}
