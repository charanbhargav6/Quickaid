'use client';
import { useState, useEffect } from 'next';
import { supabase } from '@/lib/supabase';
import styles from './Users.module.css';

export default function Users() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (!error && data) {
        // Map database fields to the structure expected by the UI if necessary
        // e.g., assuming profiles has id, full_name, email, role, status, created_at
        const formattedData = data.map(profile => ({
          id: profile.id,
          name: profile.full_name || profile.name || 'Unknown',
          email: profile.email || 'N/A',
          role: profile.role || 'User',
          status: profile.status || 'Active',
          joined: new Date(profile.created_at).toISOString().split('T')[0]
        }));
        setUsers(formattedData);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="page-title">User Management</h1>
        <button className="btn-primary">Add User</button>
      </div>

      <div className={`${styles.tableCard} glass-panel`}>
        <div className={styles.toolbar}>
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            className={`input-field ${styles.searchInput}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={`input-field ${styles.filterSelect}`}>
            <option value="all">All Roles</option>
            <option value="seeker">Seeker</option>
            <option value="helper">Helper</option>
          </select>
          <select className={`input-field ${styles.filterSelect}`}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>{user.name.charAt(0)}</div>
                      <div>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.roleTag}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[user.status.toLowerCase()]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className={styles.date}>{user.joined}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn}>Edit</button>
                      {user.status === 'Suspended' ? (
                        <button className={`${styles.actionBtn} ${styles.unsuspend}`}>Unsuspend</button>
                      ) : (
                        <button className={`${styles.actionBtn} ${styles.suspend}`}>Suspend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
