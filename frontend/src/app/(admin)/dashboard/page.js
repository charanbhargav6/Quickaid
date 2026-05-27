'use client';
import { useState, useEffect } from 'next';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState([
    { title: 'Total Users', value: '...', icon: '👥', trend: '' },
    { title: 'Active Tasks', value: '...', icon: '📝', trend: '' },
    { title: 'Completed Tasks', value: '...', icon: '✅', trend: '' },
    { title: 'Revenue', value: '...', icon: '💰', trend: '' },
  ]);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      const [profilesRes, tasksRes, transRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*'),
        supabase.from('transactions').select('amount')
      ]);

      const totalUsers = profilesRes.count || 0;
      const allTasks = tasksRes.data || [];
      const activeTasks = allTasks.filter(t => t.status === 'In Progress' || t.status === 'Open').length;
      const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
      
      const transactions = transRes.data || [];
      const totalRevenue = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

      setStats([
        { title: 'Total Users', value: totalUsers.toString(), icon: '👥', trend: 'Live' },
        { title: 'Active Tasks', value: activeTasks.toString(), icon: '📝', trend: 'Live' },
        { title: 'Completed Tasks', value: completedTasks.toString(), icon: '✅', trend: 'Live' },
        { title: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: '💰', trend: 'Live' },
      ]);

      const latestTasks = allTasks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title || 'Untitled',
        seeker: t.seeker_name || 'Unknown',
        helper: t.helper_name || 'Pending',
        status: t.status || 'Open',
        amount: `$${t.budget || t.amount || 0}`
      }));
      setRecentTasks(latestTasks);
    }
    fetchDashboardData();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className="page-title">Dashboard Overview</h1>
      
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={`${styles.statCard} glass-panel`}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>{stat.title}</span>
              <span className={styles.statIcon}>{stat.icon}</span>
            </div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statTrend}>{stat.trend} this month</div>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={`${styles.chartSection} glass-panel`}>
          <h2>Activity Chart</h2>
          <div className={styles.mockChart}>
            <div className={styles.chartBar} style={{ height: '40%' }}></div>
            <div className={styles.chartBar} style={{ height: '60%' }}></div>
            <div className={styles.chartBar} style={{ height: '35%' }}></div>
            <div className={styles.chartBar} style={{ height: '80%' }}></div>
            <div className={styles.chartBar} style={{ height: '50%' }}></div>
            <div className={styles.chartBar} style={{ height: '90%' }}></div>
            <div className={styles.chartBar} style={{ height: '70%' }}></div>
          </div>
        </div>
        
        <div className={`${styles.recentSection} glass-panel`}>
          <h2>Recent Tasks</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className={styles.taskTitle}>{task.title}</div>
                      <div className={styles.taskUsers}>{task.seeker}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[task.status.replace(' ', '')]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className={styles.amount}>{task.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
