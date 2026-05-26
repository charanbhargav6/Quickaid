'use client';
import { useState } from 'next';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    // Mock login logic
    console.log('Logging in with', email, password);
    router.push('/dashboard');
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} glass-panel`}>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>Quick<span className={styles.orangeText}>Aid</span></h1>
        </div>
        <p className={styles.subtitle}>Admin Portal</p>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="admin@quickaid.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={`btn-primary ${styles.loginBtn}`}>
            Sign In
          </button>
        </form>

        <div className={styles.demoNotice}>
          <p>Demo Mode: Any credentials will work.</p>
        </div>
      </div>
    </div>
  );
}
