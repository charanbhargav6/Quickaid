'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentAdminEmail, setCurrentAdminEmail] = useState(null);

  useEffect(() => {
    fetchUsers();

    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminEmail(user.email);
      }
    };
    fetchCurrentUser();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchUsers() {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSuspend(userId, isSuspended) {
    const supabase = createClient();
    await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId);
    fetchUsers();
  }

  async function handleChangeRole(userId, newRole) {
    const supabase = createClient();
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
    router.refresh();
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
                        {currentAdminEmail === 'pro171903@gmail.com' && (
                          <select 
                            className="input" 
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '13px', display: 'inline-block', marginRight: '8px' }}
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          >
                            {/* Always show current role as the selected/disabled option */}
                            <option value={user.role} disabled>
                              Current: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </option>
                            {/* Only show promote to admin if not already admin */}
                            {user.role !== 'admin' && (
                              <option value="admin">Promote to Admin</option>
                            )}
                            {/* Only show demote to user if they have elevated roles */}
                            {(user.role === 'admin' || user.role === 'helper' || user.role === 'both') && (
                              <option value="seeker">Demote to User</option>
                            )}
                            {/* Only show make helper if they are just a seeker */}
                            {user.role === 'seeker' && (
                              <option value="helper">Make Helper</option>
                            )}
                          </select>
                        )}
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
