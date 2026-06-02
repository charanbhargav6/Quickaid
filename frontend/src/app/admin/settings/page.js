'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './Settings.module.css';

export default function Settings() {
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setMsg('Passwords do not match.');
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      setMsg(error.message);
    } else {
      setMsg('Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className="page-title">Settings</h1>
      
      <div className={styles.grid}>
        <div className={`${styles.section} glass-panel`}>
          <h2>Appearance</h2>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>Theme</h3>
              <p>Select your preferred color theme</p>
            </div>
            <select 
              className="input-field" 
              style={{ width: '150px' }}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme (Coming Soon)</option>
            </select>
          </div>
        </div>

        <div className={`${styles.section} glass-panel`}>
          <h2>Notifications</h2>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>Email Alerts</h3>
              <p>Receive emails for important system events</p>
            </div>
            <label className={styles.toggle}>
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={(e) => setNotifications(e.target.checked)} 
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={`${styles.section} glass-panel`}>
          <h2>Security</h2>
          {msg && <div style={{ marginBottom: '1rem', color: msg.includes('successfully') ? '#4ade80' : '#f87171' }}>{msg}</div>}
          <form className={styles.form}>
            <div className={styles.inputGroup}>
              <label>New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Confirm New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="button" onClick={handleUpdatePassword} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
