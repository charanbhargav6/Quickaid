'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export default function WalletPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .gt('wallet_balance', 0)
        .order('wallet_balance', { ascending: false });

      if (!error && data) {
        setUsers(data);
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
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>User Wallets & Withdrawals</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Manage payouts for helpers who have completed tasks.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>USER ID</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>NAME</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>ROLE</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>BALANCE</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users have a wallet balance.</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {user.id.split('-')[0]}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {user.full_name}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: user.role === 'helper' ? 'var(--blue-100)' : 'var(--slate-100)',
                      color: user.role === 'helper' ? 'var(--blue-700)' : 'var(--slate-700)'
                    }}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '16px', fontWeight: '800', color: 'var(--green-600)' }}>
                    ₹{user.wallet_balance}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Process Payout</button>
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
