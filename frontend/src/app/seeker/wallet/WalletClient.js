'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddFundsModal from '@/components/AddFundsModal';
import styles from './Wallet.module.css';
import { createClient } from '@/lib/supabase';

const TX_ICONS = {
  deposit:      { icon: '⬇️', label: 'Deposited',        color: '#16a34a' },
  credit:       { icon: '💰', label: 'Credited (Payout)', color: '#16a34a' },
  escrow:       { icon: '🔒', label: 'Escrowed (Task)',   color: '#dc2626' },
  refund:       { icon: '↩️', label: 'Refunded',          color: '#16a34a' },
  payout:       { icon: '⬆️', label: 'Withdrawn',         color: '#dc2626' },
  withdrawal:   { icon: '🏦', label: 'UPI Withdrawal',    color: '#dc2626' },
  platform_fee: { icon: '📊', label: 'Platform Revenue',  color: '#16a34a' },
};

export default function WalletClient({ initialBalance, initialTransactions }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balance, setBalance] = useState(Number(initialBalance));
  const router = useRouter();

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    const amt = parseFloat(withdrawAmount);
    if (!upiId.trim() || !upiId.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID (e.g. name@upi).');
      return;
    }
    if (isNaN(amt) || amt < 10) {
      setWithdrawError('Minimum withdrawal amount is ₹10.');
      return;
    }
    if (amt > balance) {
      setWithdrawError(`Insufficient balance. Your current balance is ₹${balance.toFixed(2)}.`);
      return;
    }
    setWithdrawing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Deduct from wallet
    const { error: balErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: balance - amt })
      .eq('id', user.id);
    
    if (balErr) { setWithdrawError('Failed to process withdrawal.'); setWithdrawing(false); return; }
    
    // 2. Record withdrawal transaction
    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      user_id: user.id,
      amount: amt,
      type: 'withdrawal',
      description: `UPI: ${upiId.trim()}`,
    }).select().single();

    setWithdrawing(false);
    if (!txErr && tx) {
      setBalance(prev => prev - amt);
      setTransactions(prev => [tx, ...prev]);
      setIsWithdrawOpen(false);
      setUpiId('');
      setWithdrawAmount('');
    } else {
      setWithdrawError('Withdrawal recorded but balance sync failed. Please refresh.');
    }
  };

  return (
    <div>
      {/* Balance Card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Current Balance</span>
          <span className={styles.balanceAmount}>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Funds
          </button>
          <button className="btn btn-outline" onClick={() => setIsWithdrawOpen(true)} disabled={balance < 10}>
            🏦 Withdraw
          </button>
        </div>
      </div>

      {/* UPI Withdrawal Modal */}
      {isWithdrawOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontWeight: 800 }}>Withdraw to UPI</h2>
              <button onClick={() => { setIsWithdrawOpen(false); setWithdrawError(''); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
              Available: <strong>₹{balance.toFixed(2)}</strong>
            </p>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>UPI ID</label>
                <input
                  className="input"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Min ₹10"
                  min="10"
                  max={balance}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[100, 500, 1000].map(v => (
                    <button key={v} type="button" className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '12px', opacity: v > balance ? 0.4 : 1 }}
                      disabled={v > balance}
                      onClick={() => setWithdrawAmount(String(v))}>₹{v}</button>
                  ))}
                  <button type="button" className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setWithdrawAmount(String(Math.floor(balance)))}>All</button>
                </div>
              </div>
              {withdrawError && (
                <div style={{ color: '#dc2626', fontSize: '13px', background: 'rgba(220,38,38,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                  {withdrawError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIsWithdrawOpen(false); setWithdrawError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={withdrawing}>
                  {withdrawing ? 'Processing…' : `Withdraw ₹${withdrawAmount || 0}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className={`card ${styles.historyCard}`}>
        <h3 className="section-title">Transaction History</h3>
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No transactions yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {transactions.map(tx => {
              const meta = TX_ICONS[tx.type] || { icon: '💳', label: tx.type, color: '#64748b' };
              const isCredit = ['deposit', 'credit', 'refund', 'platform_fee'].includes(tx.type);
              return (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 4px', borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px' }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{meta.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(tx.created_at).toLocaleString()} {tx.description ? `· ${tx.description}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: meta.color }}>
                    {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddFundsModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); router.refresh(); }} />
    </div>
  );
}
