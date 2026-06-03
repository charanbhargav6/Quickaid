'use client';
import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    totalTasks: 0, totalTasksChange: 0, 
    completed: 0, completedChange: 0, 
    earnings: 0, earningsChange: 0, 
    helpers: 0, helpersChange: 0, 
    users: 0, usersChange: 0 
  });
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchData();

    const supabase = createClient();
    const tasksChannel = supabase
      .channel('realtime-admin-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();
    const profilesChannel = supabase
      .channel('realtime-admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();
      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('total_earnings', { ascending: false }),
      ]);

      const allTasks = tasksRes.data || [];
      const allProfiles = profilesRes.data || [];

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Helper to calculate percentage change
      const calcChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // 1. Total Tasks
      const tasksThisWeek = allTasks.filter(t => new Date(t.created_at) >= oneWeekAgo).length;
      const tasksLastWeek = allTasks.filter(t => new Date(t.created_at) >= twoWeeksAgo && new Date(t.created_at) < oneWeekAgo).length;
      
      // 2. Completed Tasks
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      const compThisWeek = completedTasks.filter(t => new Date(t.created_at) >= oneWeekAgo).length;
      const compLastWeek = completedTasks.filter(t => new Date(t.created_at) >= twoWeeksAgo && new Date(t.created_at) < oneWeekAgo).length;

      // 3. Earnings
      const totalEarnings = completedTasks.reduce((sum, t) => sum + (parseFloat(t.pay) || 0), 0);
      const earnThisWeek = completedTasks.filter(t => new Date(t.created_at) >= oneWeekAgo).reduce((sum, t) => sum + (parseFloat(t.pay) || 0), 0);
      const earnLastWeek = completedTasks.filter(t => new Date(t.created_at) >= twoWeeksAgo && new Date(t.created_at) < oneWeekAgo).reduce((sum, t) => sum + (parseFloat(t.pay) || 0), 0);

      // 4. Active Helpers
      const helpers = allProfiles.filter(p => p.role === 'helper' || p.role === 'both');
      const helpersThisWeek = helpers.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
      const helpersLastWeek = helpers.filter(p => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo).length;

      // 5. Total Users
      const usersThisWeek = allProfiles.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
      const usersLastWeek = allProfiles.filter(p => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo).length;

      setStats({
        totalTasks: allTasks.length,
        totalTasksChange: calcChange(tasksThisWeek, tasksLastWeek),
        completed: completedTasks.length,
        completedChange: calcChange(compThisWeek, compLastWeek),
        earnings: totalEarnings,
        earningsChange: calcChange(earnThisWeek, earnLastWeek),
        helpers: helpers.length,
        helpersChange: calcChange(helpersThisWeek, helpersLastWeek),
        users: allProfiles.length,
        usersChange: calcChange(usersThisWeek, usersLastWeek),
      });
      setTasks(allTasks);
      setProfiles(allProfiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Compute category breakdown
  const categories = {};
  tasks.forEach(t => {
    const cat = t.category || 'Others';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  const categoryList = Object.entries(categories).sort((a,b) => b[1] - a[1]);
  const categoryColors = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#64748b'];

  // Compute status breakdown
  const statusMap = { open: 0, accepted: 0, completed: 0, cancelled: 0 };
  tasks.forEach(t => { if (statusMap[t.status] !== undefined) statusMap[t.status]++; });

  // Top helpers
  const topHelpers = profiles
    .filter(p => p.role === 'helper' || p.role === 'admin')
    .sort((a,b) => (b.tasks_completed || 0) - (a.tasks_completed || 0))
    .slice(0, 5);

  // Recent activity from tasks
  const recentTasks = tasks.slice(0, 5);

  if (loading) {
    return (
      <div style={{padding: '24px'}}>
        <div className="skeleton skeleton-box"></div>
        <div className="skeleton skeleton-box"></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>QuickAid Platform Dashboard Overview</h1>
          <p className={styles.pageSubtitle}>Monitor your platform performance and activity</p>
        </div>
      </header>

      {/* ── Stats Row ────────────────────────── */}
      <div className={styles.statsRow}>
        <StatCard icon="📋" iconBg="#dbeafe" label="TOTAL TASKS" value={stats.totalTasks} change={`${stats.totalTasksChange >= 0 ? '+' : ''}${stats.totalTasksChange}% from last week`} isPositive={stats.totalTasksChange >= 0} />
        <StatCard icon="✅" iconBg="#dcfce7" label="COMPLETED TASKS" value={stats.completed} change={`${stats.completedChange >= 0 ? '+' : ''}${stats.completedChange}% from last week`} isPositive={stats.completedChange >= 0} />
        <StatCard icon="⭐" iconBg="#fef3c7" label="TOTAL EARNINGS" value={`₹${stats.earnings.toLocaleString()}`} change={`${stats.earningsChange >= 0 ? '+' : ''}${stats.earningsChange}% from last week`} isPositive={stats.earningsChange >= 0} />
        <StatCard icon="🧑‍🔧" iconBg="#e0e7ff" label="ACTIVE HELPERS" value={stats.helpers} change={`${stats.helpersChange >= 0 ? '+' : ''}${stats.helpersChange}% from last week`} isPositive={stats.helpersChange >= 0} />
        <StatCard icon="🛡️" iconBg="#fce7f3" label="TRUSTED USERS" value={stats.users} change={`${stats.usersChange >= 0 ? '+' : ''}${stats.usersChange}% from last week`} isPositive={stats.usersChange >= 0} />
      </div>

      {/* ── Charts Row ───────────────────────── */}
      <div className={styles.chartsRow}>
        {/* Task Categories Donut */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.cardTitle}>Task Categories Overview</h3>
          <div className={styles.donutWrap}>
            <div className={styles.donutChart}>
              <svg viewBox="0 0 120 120" className={styles.donutSvg}>
                {renderDonut(categoryList, categoryColors, stats.totalTasks)}
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutValue}>{stats.totalTasks}</span>
                <span className={styles.donutLabel}>Total Tasks</span>
              </div>
            </div>
            <div className={styles.legendList}>
              {categoryList.map(([cat, count], i) => (
                <div key={cat} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: categoryColors[i % categoryColors.length] }} />
                  <span className={styles.legendText}>{cat}</span>
                  <span className={styles.legendCount}>{count} ({stats.totalTasks ? ((count/stats.totalTasks)*100).toFixed(1) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Status Donut */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.cardTitle}>Task Status</h3>
          <div className={styles.donutWrap}>
            <div className={styles.donutChart}>
              <svg viewBox="0 0 120 120" className={styles.donutSvg}>
                {renderDonut(
                  Object.entries(statusMap).filter(([,v]) => v > 0),
                  ['#22c55e', '#3b82f6', '#64748b', '#ef4444'],
                  stats.totalTasks
                )}
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutValue}>{stats.completed}</span>
                <span className={styles.donutLabel}>Completed</span>
              </div>
            </div>
            <div className={styles.legendList}>
              {[
                { label: 'Completed', count: statusMap.completed, color: '#22c55e' },
                { label: 'In Progress', count: statusMap.accepted, color: '#3b82f6' },
                { label: 'Open', count: statusMap.open, color: '#64748b' },
                { label: 'Cancelled', count: statusMap.cancelled, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: s.color }} />
                  <span className={styles.legendText}>{s.label}</span>
                  <span className={styles.legendCount}>{s.count} ({stats.totalTasks ? ((s.count/stats.totalTasks)*100).toFixed(1) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`card ${styles.activityCard}`}>
          <div className="section-header">
            <h3 className="section-title">Recent Activity</h3>
            <span className="section-action">View All</span>
          </div>
          <div className={styles.activityList}>
            {recentTasks.length === 0 ? (
              <p className={styles.emptyText}>No recent activity</p>
            ) : (
              recentTasks.map((task, i) => (
                <div key={task.id} className="activity-item fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="activity-icon" style={{ background: task.status === 'completed' ? '#dcfce7' : task.status === 'accepted' ? '#dbeafe' : '#f1f5f9' }}>
                    {task.status === 'completed' ? '✅' : task.status === 'accepted' ? '🤝' : '📌'}
                  </div>
                  <div className="activity-info">
                    <p className="activity-title">{task.status === 'completed' ? 'Task completed' : task.status === 'accepted' ? 'Task accepted' : 'New task posted'}</p>
                    <p className="activity-desc">{task.title}</p>
                  </div>
                  <span className="activity-time">{isMounted ? timeAgo(task.created_at) : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────── */}
      <div className={styles.bottomRow}>
        {/* Tasks Over Time Bar Chart */}
        <div className={`card ${styles.chartCardWide}`}>
          <h3 className={styles.cardTitle}>Tasks Over Time (This Week)</h3>
          <div className={styles.barChart}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              // Deterministic fake data to prevent hydration mismatch
              const posted = (i * 7) % 30 + 10;
              const completed = Math.floor(posted * 0.7);
              const maxH = 120;
              return (
                <div key={day} className={styles.barGroup}>
                  <div className={styles.barWrapper}>
                    <div className={styles.barMain} style={{ height: `${(posted / 40) * maxH}px` }}>
                      <div className={styles.barSub} style={{ height: `${(completed / posted) * 100}%` }} />
                    </div>
                  </div>
                  <span className={styles.barLabel}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.barLegend}>
            <span><span className={styles.barLegendDot} style={{ background: '#22c55e' }} /> Posted Tasks</span>
            <span><span className={styles.barLegendDot} style={{ background: '#166534' }} /> Completed Tasks</span>
          </div>
        </div>

        {/* Top Helpers */}
        <div className={`card ${styles.chartCard}`}>
          <div className="section-header">
            <h3 className="section-title">Top Helpers</h3>
            <span className="section-action">View All</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Tasks</th>
                <th>Earned</th>
              </tr>
            </thead>
            <tbody>
              {topHelpers.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No helpers yet</td></tr>
              ) : (
                topHelpers.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 700, color: 'var(--green-600)' }}>{i + 1}</td>
                    <td>
                      <div className={styles.helperRow}>
                        <div className={styles.helperAvatar}>{(h.full_name || 'U')[0]}</div>
                        <span>{h.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>⭐ {(h.trust_score / 20).toFixed(1)}</td>
                    <td>{h.tasks_completed || 0} Tasks</td>
                    <td style={{ fontWeight: 600 }}>₹{(h.total_earnings || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ratings Overview */}
        <div className={`card ${styles.ratingsCard}`}>
          <div className="section-header">
            <h3 className="section-title">User Ratings Overview</h3>
            <span className="section-action">View All</span>
          </div>
          <div className={styles.ratingsCenter}>
            <span className={styles.ratingsBig}>4.7</span>
            <div className={styles.ratingsStars}>⭐⭐⭐⭐⭐</div>
            <p className={styles.ratingsCount}>Based on {stats.users} Reviews</p>
          </div>
          <div className={styles.ratingsBars}>
            {[
              { stars: 5, pct: 70, color: '#22c55e' },
              { stars: 4, pct: 20, color: '#22c55e' },
              { stars: 3, pct: 7, color: '#f97316' },
              { stars: 2, pct: 2, color: '#ef4444' },
              { stars: 1, pct: 1, color: '#ef4444' },
            ].map(r => (
              <div key={r.stars} className={styles.ratingRow}>
                <span className={styles.ratingLabel}>{r.stars} ★</span>
                <div className={styles.ratingBarBg}>
                  <div className={styles.ratingBarFill} style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
                <span className={styles.ratingPct}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────── */}
      <div className="footer-banner">
        <span>✅</span>
        <span>QuickAid ensures safe, reliable and trusted help for everyone in your community.</span>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────── */
function StatCard({ icon, iconBg, label, value, change, isPositive }) {
  const changeColor = change.startsWith('0%') ? 'var(--text-muted)' : isPositive ? '#16a34a' : '#dc2626';
  return (
    <div className="stat-card fade-in">
      <div className="icon-wrap" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-change" style={{ color: changeColor, fontWeight: '600' }}>{change}</p>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderDonut(entries, colors, total) {
  if (!total || entries.length === 0) return null;
  const cx = 60, cy = 60, r = 48;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return entries.map(([label, count], i) => {
    const pct = count / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const el = (
      <circle
        key={label}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={colors[i % colors.length]}
        strokeWidth="18"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        style={{ transition: 'all 0.6s ease' }}
      />
    );
    offset += dash;
    return el;
  });
}
