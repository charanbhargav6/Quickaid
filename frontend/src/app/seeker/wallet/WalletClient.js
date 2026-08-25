'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddFundsModal from '@/components/AddFundsModal';
import styles from './Wallet.module.css';
import { createClient } from '@/lib/supabase';
import { requestWithdrawal } from '../_actions/withdrawActions';

const TX_ICONS = {
  earning:      { icon: '⬇️', label: 'Added to Wallet', color: '#16a34a' },
  payment:      { icon: '🔒', label: 'Payment / Escrow', color: '#dc2626' },
  refund:       { icon: '↩️', label: 'Refunded', color: '#16a34a' },
  withdrawal:   { icon: '🏦', label: 'Withdrawn', color: '#dc2626' },
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

  // Sync props to state when Next.js router.refresh() fetches new data
  useEffect(() => {
    setBalance(Number(initialBalance));
  }, [initialBalance]);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

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
    const res = await requestWithdrawal(amt);
    setWithdrawing(false);
    
    if (res.success) {
      setBalance(prev => prev - amt);
      setIsWithdrawOpen(false);
      setUpiId('');
      setWithdrawAmount('');
      router.refresh();
    } else {
      setWithdrawError(res.error || 'Withdrawal failed. Please try again.');
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
              const isCredit = ['earning', 'refund'].includes(tx.type);
              const txTitle = tx.description ? tx.description.split(' | ')[0] : meta.label;
              const txSubtitle = tx.description?.includes(' | ') ? tx.description.split(' | ')[1] : '';
              
              return (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 4px', borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px' }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{txTitle}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} {txSubtitle ? `· ${txSubtitle}` : ''}
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
