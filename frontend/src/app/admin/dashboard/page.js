'use client';
import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { createClient } from '@/lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    totalTasks: 0, 
    completed: 0, 
    totalPayouts: 0, 
    platformRevenue: 0,
    helpers: 0, 
    users: 0,
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

      // 1. Total Tasks
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      
      // Calculate Status and Category counts
      const taskStatusCounts = {};
      const taskCategoryCounts = {};
      allTasks.forEach(t => {
        taskStatusCounts[t.status] = (taskStatusCounts[t.status] || 0) + 1;
        const cat = t.category || 'Other';
        taskCategoryCounts[cat] = (taskCategoryCounts[cat] || 0) + 1;
      });

      // 2. Earnings & Platform Revenue
      const totalPayouts = completedTasks.reduce((sum, t) => sum + (parseFloat(t.pay) || 0), 0);
      const platformRevenue = totalPayouts * 0.05; // 5% Platform Fee

      // 3. Active Helpers
      const helpers = allProfiles.filter(p => p.role === 'helper' || p.role === 'both');

      setStats({
        totalTasks: allTasks.length,
        completed: completedTasks.length,
        totalPayouts: totalPayouts,
        platformRevenue: platformRevenue,
        helpers: helpers.length,
        users: allProfiles.length,
        taskStatusCounts,
        taskCategoryCounts,
      });
      setTasks(allTasks);
      setProfiles(allProfiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // --- Compute Chart Data ---
  // Last 7 Days Revenue Data
  const revenueData = [];
  const funnelData = [];
  
  if (isMounted) {
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      
      // Filter tasks completed on this day
      const dayTasks = tasks.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate >= dayStart && tDate <= dayEnd;
      });

      const dayCompleted = dayTasks.filter(t => t.status === 'completed');
      const dayPayouts = dayCompleted.reduce((sum, t) => sum + (parseFloat(t.pay) || 0), 0);
      const dayRev = dayPayouts * 0.05;

      revenueData.push({
        name: dayStr,
        Revenue: Math.round(dayRev),
        Volume: Math.round(dayPayouts)
      });

      funnelData.push({
        name: dayStr,
        Posted: dayTasks.length,
        Completed: dayCompleted.length
      });
    }
  }

  // User Growth — cumulative registrations last 30 days
  const userGrowthData = [];
  if (isMounted) {
    const now = new Date();
    let cumulative = 0;
    const baseDate = new Date();
    baseDate.setDate(now.getDate() - 29);
    baseDate.setHours(0, 0, 0, 0);
    // count users registered before window as base
    const priorUsers = profiles.filter(p => new Date(p.created_at) < baseDate).length;
    cumulative = priorUsers;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      const dayLabel = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newUsers = profiles.filter(p => {
        const t = new Date(p.created_at);
        return t >= dayStart && t <= dayEnd;
      }).length;
      cumulative += newUsers;
      if (i % 5 === 0 || i === 29 || i === 0) { // show every 5th day label
        userGrowthData.push({ name: dayLabel, Users: cumulative, New: newUsers });
      }
    }
  }

  // Top helpers - must have completed at least 1 task
  const topHelpers = profiles
    .filter(p => (p.role === 'helper' || p.role === 'both' || p.role === 'admin') && (p.tasks_completed || 0) > 0)
    .sort((a,b) => (b.tasks_completed || 0) - (a.tasks_completed || 0))
    .slice(0, 5);

  const recentTasks = tasks.slice(0, 5);

  if (loading || !isMounted) {
    return (
      <div style={{padding: '24px'}}>
        <div className="skeleton skeleton-box"></div>
        <div className="skeleton skeleton-box" style={{marginTop: '20px'}}></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Platform Analytics & Revenue</h1>
          <p className={styles.pageSubtitle}>Real-time breakdown of QuickAid's economic engine (5% Fee Model)</p>
        </div>
      </header>

      {/* ── High Impact Revenue Cards ────────────────────────── */}
      <div className={styles.statsRow}>
        <div className="stat-card fade-in" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
          <div className="stat-info">
            <p className="stat-label" style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>PLATFORM REVENUE (5%)</p>
            <p className="stat-value" style={{ color: 'white', fontSize: '32px' }}>₹{Math.round(stats.platformRevenue).toLocaleString()}</p>
          </div>
          <div className="icon-wrap" style={{ background: 'rgba(255,255,255,0.2)' }}>💰</div>
        </div>
        
        <div className="stat-card fade-in" style={{ background: 'white' }}>
          <div className="stat-info">
            <p className="stat-label">TOTAL TRANSACTION VOLUME</p>
            <p className="stat-value">₹{Math.round(stats.totalPayouts).toLocaleString()}</p>
          </div>
          <div className="icon-wrap" style={{ background: '#fef3c7' }}>💳</div>
        </div>

        <StatCard icon="📋" iconBg="#dbeafe" label="TOTAL TASKS" value={stats.totalTasks} />
        <StatCard icon="✅" iconBg="#dcfce7" label="COMPLETED" value={stats.completed} />
        <StatCard icon="🛡️" iconBg="#fce7f3" label="TOTAL USERS" value={stats.users} />
      </div>

      {/* ── Interactive Charts Row ───────────────────────── */}
      <div className={styles.chartsRow}>
        {/* Task Categories Overview */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.cardTitle}>Task Categories Overview</h3>
          <div className={styles.donutWrap}>
            <div className={styles.donutChart}>
              <svg className={styles.donutSvg} viewBox="0 0 120 120">
                {renderDonut(
                  Object.entries(stats.taskCategoryCounts || {}).sort((a,b)=>b[1]-a[1]),
                  ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'],
                  stats.totalTasks
                )}
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutValue}>{stats.totalTasks}</span>
                <span className={styles.donutLabel}>Tasks</span>
              </div>
            </div>
            <div className={styles.legendList}>
              {Object.entries(stats.taskCategoryCounts || {}).sort((a,b)=>b[1]-a[1]).map(([label, count], i) => (
                <div key={label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'][i % 5] }} />
                  <span className={styles.legendText}>{label}</span>
                  <span className={styles.legendCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Status */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.cardTitle}>Task Status</h3>
          <div className={styles.donutWrap}>
            <div className={styles.donutChart}>
              <svg className={styles.donutSvg} viewBox="0 0 120 120">
                {renderDonut(
                  Object.entries(stats.taskStatusCounts || {}).sort((a,b)=>b[1]-a[1]),
                  ['#22c55e', '#f59e0b', '#3b82f6', '#64748b'],
                  stats.totalTasks
                )}
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutValue}>{stats.completed}</span>
                <span className={styles.donutLabel}>Done</span>
              </div>
            </div>
            <div className={styles.legendList}>
              {Object.entries(stats.taskStatusCounts || {}).sort((a,b)=>b[1]-a[1]).map(([label, count], i) => (
                <div key={label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: ['#22c55e', '#f59e0b', '#3b82f6', '#64748b'][i % 4] }} />
                  <span className={styles.legendText} style={{textTransform:'capitalize'}}>{label.replace('_', ' ')}</span>
                  <span className={styles.legendCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Area Chart */}
        <div className={`card ${styles.chartCardWide}`} style={{ height: '400px' }}>
          <h3 className={styles.cardTitle}>Platform Revenue Over Time (Last 7 Days)</h3>
          <div style={{ width: '100%', height: '100%', paddingBottom: '30px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Conversion Bar Chart */}
        <div className={`card ${styles.chartCard}`} style={{ height: '400px' }}>
          <h3 className={styles.cardTitle}>Task Conversion Funnel</h3>
          <div style={{ width: '100%', height: '100%', paddingBottom: '30px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Posted" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── User Growth Chart ────────────────────────── */}
      <div className={`card ${styles.chartCardWide}`} style={{ height: '320px', margin: '0 0 24px 0' }}>
        <h3 className={styles.cardTitle}>📈 User Growth (Last 30 Days)</h3>
        <div style={{ width: '100%', height: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '13px' }} />
              <Line type="monotone" dataKey="Users" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="New" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────── */}
      <div className={styles.bottomRow}>
        {/* Top Helpers */}
        <div className={`card ${styles.chartCardWide}`}>
          <div className="section-header">
            <h3 className="section-title">Top Earning Helpers</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Tasks Completed</th>
                <th>Net Earned (After 5% Fee)</th>
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
                    <td>{h.tasks_completed || 0}</td>
                    <td style={{ fontWeight: 600 }}>₹{(h.total_earnings || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className={`card ${styles.chartCard}`}>
          <div className="section-header">
            <h3 className="section-title">Live Transaction Feed</h3>
          </div>
          <div className={styles.activityList}>
            {recentTasks.length === 0 ? (
              <p className={styles.emptyText}>No recent activity</p>
            ) : (
              recentTasks.map((task, i) => (
                <div key={task.id} className="activity-item fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="activity-icon" style={{ background: task.status === 'completed' ? '#dcfce7' : task.status === 'accepted' ? '#dbeafe' : '#f1f5f9' }}>
                    {task.status === 'completed' ? '💰' : task.status === 'accepted' ? '🤝' : '📌'}
                  </div>
                  <div className="activity-info">
                    <p className="activity-title">
                      {task.status === 'completed' 
                        ? `Platform earned ₹${(task.pay * 0.05).toFixed(1)}` 
                        : task.status === 'accepted' ? 'Task in progress' : 'New task posted'}
                    </p>
                    <p className="activity-desc">{task.title}</p>
                  </div>
                  <span className="activity-time">{isMounted ? timeAgo(task.created_at) : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────── */
function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="stat-card fade-in">
      <div className="icon-wrap" style={{ background: iconBg }}>{icon}</div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
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
