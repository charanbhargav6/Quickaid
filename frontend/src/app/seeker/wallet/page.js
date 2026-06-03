import { createClient } from '@/utils/supabase/server';
import WalletClient from './WalletClient';
import styles from './Wallet.module.css';

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>My Wallet</h1>
        <p className={styles.pageSubtitle}>Manage your funds and transaction history</p>
      </header>
      
      <WalletClient initialBalance={balance} initialTransactions={transactions || []} />
    </div>
  );
}
