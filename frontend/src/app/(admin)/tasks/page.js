'use client';
import { useState, useEffect } from 'next';
import { supabase } from '@/lib/supabase';
import styles from './Tasks.module.css';

export default function Tasks() {
  const [filter, setFilter] = useState('All');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*');
      
      if (!error && data) {
        const formattedData = data.map(task => ({
          id: task.id || 'N/A',
          title: task.title || 'Untitled Task',
          desc: task.description || task.desc || 'No description',
          seeker: task.seeker_name || 'Unknown',
          helper: task.helper_name || 'Unassigned',
          status: task.status || 'Open',
          amount: task.budget || task.amount || 0,
          date: task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Unknown'
        }));
        setTasks(formattedData);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

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
