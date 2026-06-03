'use client';

import { useState } from 'react';
import AddFundsModal from '@/components/AddFundsModal';
import styles from './Wallet.module.css';

export default function WalletClient({ initialBalance, initialTransactions }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <div className={styles.balanceCard}>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Current Balance</span>
          <span className={styles.balanceAmount}>₹{Number(initialBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Add Funds
        </button>
      </div>

      <div className={`card ${styles.historyCard}`}>
        <h3 className="section-title">Transaction History</h3>
        
        {initialTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No transactions yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {initialTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td>
                      <span className={styles.txType}>
                        {tx.type === 'deposit' ? '⬇️ Deposit' : 
                         tx.type === 'escrow' ? '🔒 Escrow (Task)' : 
                         tx.type === 'refund' ? '↩️ Refund' : 
                         tx.type === 'payout' ? '⬆️ Payout' : tx.type}
                      </span>
                    </td>
                    <td style={{ color: tx.type === 'escrow' || tx.type === 'payout' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                      {tx.type === 'escrow' || tx.type === 'payout' ? '-' : '+'}₹{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`status-badge status-${tx.status}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddFundsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
