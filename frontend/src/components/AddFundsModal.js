'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addFunds } from '@/app/seeker/_actions/walletActions';
import toast from 'react-hot-toast';

export default function AddFundsModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleAddFunds = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate payment processor delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = await addFunds({ amount: Number(amount) });
    setLoading(false);
    
    if (result.success) {
      toast.success(`Successfully added ₹${amount} to wallet!`);
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Top-Up Wallet</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3>Payment Successful!</h3>
            <p style={{ color: 'var(--text-muted)' }}>₹{amount} has been added to your wallet.</p>
          </div>
        ) : (
          <form onSubmit={handleAddFunds} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            
            <div className="form-group">
              <label>Amount (₹)</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {[100, 500, 1000, 5000].map(val => (
                  <button 
                    key={val}
                    type="button" 
                    className={`btn ${amount === val ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => setAmount(val)}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                className="input" 
                value={amount} 
                onChange={e => setAmount(Number(e.target.value))} 
                min="10"
                required
              />
            </div>

            <div className="form-group">
              <label>Card Number (Dummy)</label>
              <input type="text" className="input" placeholder="4242 4242 4242 4242" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Expiry</label>
                <input type="text" className="input" placeholder="MM/YY" required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>CVC</label>
                <input type="text" className="input" placeholder="123" required />
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {loading ? <span className="spinner"></span> : `Pay ₹${amount}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
