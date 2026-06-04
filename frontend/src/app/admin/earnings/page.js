'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export default function EarningsPage() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalVolume: 0, totalPlatformFee: 0, pendingPayouts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  async function fetchEarnings() {
    setLoading(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, user:user_id(full_name, role)')
        .order('created_at', { ascending: false });

      const { data: profileData } = await supabase.from('profiles').select('wallet_balance, role');

      if (!txError && txData) {
        setTransactions(txData);
        
        const totalVolume = txData.filter(t => t.type === 'credit').reduce((acc, t) => acc + Number(t.amount), 0);
        const totalFee = totalVolume * 0.1; // 10% platform fee assumed
        
        let pending = 0;
        if (profileData) {
          pending = profileData.filter(p => p.role === 'helper').reduce((acc, p) => acc + Number(p.wallet_balance || 0), 0);
        }

        setStats({ totalVolume, totalPlatformFee: totalFee, pendingPayouts: pending });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Earnings & Revenue</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Overview of platform financials, payouts, and transaction history.</p>
        </div>
        <button className="btn btn-primary">Generate Report</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', background: 'var(--blue-50)', padding: '12px', borderRadius: '12px' }}>💸</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>TOTAL VOLUME</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>₹{stats.totalVolume.toLocaleString()}</h2>
        </div>
        
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', background: 'var(--green-50)', padding: '12px', borderRadius: '12px' }}>📈</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>PLATFORM REVENUE</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>₹{stats.totalPlatformFee.toLocaleString()}</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Estimated 10% fee on tasks</span>
        </div>

        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', background: 'var(--orange-50)', padding: '12px', borderRadius: '12px' }}>🏦</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>PENDING PAYOUTS</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>₹{stats.pendingPayouts.toLocaleString()}</h2>
          <span style={{ fontSize: '13px', color: 'var(--orange-600)', fontWeight: '500' }}>In user wallets</span>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>Transaction Ledger</h3>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>DATE</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>USER</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>TYPE</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>AMOUNT</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>TASK REF</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions yet.</td></tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {tx.user?.full_name || 'Unknown'} <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginLeft: '4px' }}>({tx.user?.role || 'user'})</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: tx.type === 'credit' ? 'var(--green-100)' : 'var(--red-100)',
                      color: tx.type === 'credit' ? 'var(--green-700)' : 'var(--red-700)'
                    }}>
                      {tx.type?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '700', fontSize: '15px', color: tx.type === 'credit' ? 'var(--green-600)' : 'var(--red-600)' }}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {tx.task_id ? tx.task_id.split('-')[0] : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
