import styles from './Dashboard.module.css';

export default function Dashboard() {
  const stats = [
    { title: 'Total Users', value: '1,248', icon: '👥', trend: '+12%' },
    { title: 'Active Tasks', value: '342', icon: '📝', trend: '+5%' },
    { title: 'Completed Tasks', value: '8,924', icon: '✅', trend: '+18%' },
    { title: 'Revenue', value: '$12,450', icon: '💰', trend: '+24%' },
  ];

  const recentTasks = [
    { id: 1, title: 'Library Book Return', seeker: 'Alice J.', helper: 'Bob M.', status: 'In Progress', amount: '$5' },
    { id: 2, title: 'Coffee Delivery', seeker: 'John D.', helper: 'Sarah K.', status: 'Completed', amount: '$8' },
    { id: 3, title: 'Math Tutoring', seeker: 'Emma W.', helper: 'Pending', status: 'Open', amount: '$20' },
    { id: 4, title: 'Grocery Run', seeker: 'Mike T.', helper: 'Chris P.', status: 'Completed', amount: '$15' },
  ];

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
