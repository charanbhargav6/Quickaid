'use client';
import { useState } from 'next';
import styles from './Tasks.module.css';

export default function Tasks() {
  const [filter, setFilter] = useState('All');
  
  const tasks = [
    { id: 'T-1042', title: 'Library Book Return', desc: 'Return 3 books to main library', seeker: 'Alice J.', helper: 'Bob M.', status: 'In Progress', amount: 5, date: 'Today, 2:30 PM' },
    { id: 'T-1043', title: 'Coffee Delivery', desc: 'Get iced latte from Starbucks', seeker: 'John D.', helper: 'Sarah K.', status: 'Completed', amount: 8, date: 'Today, 10:15 AM' },
    { id: 'T-1044', title: 'Math Tutoring', desc: 'Help with Calculus II assignment', seeker: 'Emma W.', helper: 'Unassigned', status: 'Open', amount: 20, date: 'Tomorrow, 4:00 PM' },
    { id: 'T-1045', title: 'Grocery Run', desc: 'Pick up items from Trader Joes', seeker: 'Mike T.', helper: 'Chris P.', status: 'Completed', amount: 15, date: 'Yesterday' },
    { id: 'T-1046', title: 'Dorm Cleaning', desc: 'Help clean up dorm room before inspection', seeker: 'Lisa R.', helper: 'Unassigned', status: 'Open', amount: 25, date: 'Oct 25, 2023' },
  ];

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="page-title">Task Management</h1>
        <div className={styles.filters}>
          {['All', 'Open', 'In Progress', 'Completed'].map(f => (
            <button 
              key={f} 
              className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {filteredTasks.map(task => (
          <div key={task.id} className={`${styles.taskCard} glass-panel`}>
            <div className={styles.cardHeader}>
              <span className={styles.taskId}>{task.id}</span>
              <span className={`${styles.badge} ${styles[task.status.replace(' ', '')]}`}>
                {task.status}
              </span>
            </div>
            
            <h3 className={styles.title}>{task.title}</h3>
            <p className={styles.desc}>{task.desc}</p>
            
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Seeker:</span>
                <span className={styles.value}>{task.seeker}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Helper:</span>
                <span className={styles.value}>{task.helper}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Date:</span>
                <span className={styles.value}>{task.date}</span>
              </div>
            </div>
            
            <div className={styles.footer}>
              <span className={styles.amount}>${task.amount}</span>
              <button className="btn-secondary">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
