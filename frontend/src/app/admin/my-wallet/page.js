import { createClient } from '@/utils/supabase/server';
import WalletClient from '@/app/seeker/wallet/WalletClient';

export default async function AdminWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch profile wallet balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single();

  const balance = profile?.wallet_balance || 0;

  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Admin Wallet</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View your platform fee earnings and transaction history</p>
      </header>

      <WalletClient 
        initialBalance={balance} 
        initialTransactions={transactions || []} 
      />
    </div>
  );
}
