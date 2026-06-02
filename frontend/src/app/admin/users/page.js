'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSuspend(userId, isSuspended) {
    await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId);
    fetchUsers();
  }

  async function handleChangeRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (u.email?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage platform users, roles, and access</p>
        </div>
        <button className="btn btn-primary" onClick={fetchUsers}>↻ Refresh</button>
      </header>

      <div className="card" style={{ padding: '20px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <input
            className="input"
            style={{ maxWidth: '300px' }}
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 'auto' }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="seeker">Seeker</option>
            <option value="helper">Helper</option>
            <option value="both">Both</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No users found</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--green-100)', color: 'var(--green-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {(user.full_name || 'U')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.full_name || 'Unknown'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {user.id.substring(0,8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{user.email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.phone || 'No phone'}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-purple' : user.role === 'helper' ? 'badge-blue' : 'badge-green'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.is_suspended ? (
                        <span className="badge badge-red">Suspended</span>
                      ) : (
                        <span className="badge badge-gray">Active</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        className="input" 
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '13px', display: 'inline-block', marginRight: '8px' }}
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      >
                        <option value="seeker">Demote to Seeker</option>
                        <option value="helper">Demote to Helper</option>
                        <option value="both">Change to Both</option>
                        <option value="admin">Promote to Admin</option>
                      </select>
                      <button 
                        className={`btn ${user.is_suspended ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                      >
                        {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
