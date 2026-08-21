'use client';

import { useState } from 'react';
import { createRazorpayOrder, verifyAndCreditWallet } from '@/app/seeker/_actions/razorpayActions';
import toast from 'react-hot-toast';

export default function AddFundsModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!amount || amount < 10) {
      toast.error('Minimum deposit amount is ₹10.');
      return;
    }

    setLoading(true);

    // 1. Load Razorpay script dynamically
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Failed to load payment gateway. Check your internet connection.');
      setLoading(false);
      return;
    }

    // 2. Create order on the server
    const orderRes = await createRazorpayOrder(Number(amount));
    if (!orderRes.success) {
      toast.error(orderRes.error);
      setLoading(false);
      return;
    }

    // 3. Open the Razorpay payment popup
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderRes.amount,
      currency: orderRes.currency,
      name: 'QuickAid',
      description: 'Wallet Top-Up',
      order_id: orderRes.orderId,
      handler: async (response) => {
        // 4. Verify payment signature on the server and credit wallet
        const verifyRes = await verifyAndCreditWallet({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount: orderRes.amount,
        });

        if (verifyRes.success) {
          toast.success(`₹${amount} added to your wallet successfully! 🎉`);
          onClose();
        } else {
          toast.error(verifyRes.error);
        }
      },
      prefill: {
        name: '',
        email: '',
      },
      theme: {
        color: '#7c3aed', // QuickAid purple
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast('Payment cancelled.', { icon: 'ℹ️' });
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      toast.error(`Payment failed: ${response.error.description}`);
      setLoading(false);
    });
    rzp.open();
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Add Funds</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
          Securely add money to your QuickAid wallet via Razorpay.
        </p>

        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Select Amount (₹)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
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
              placeholder="Or enter custom amount"
              required
            />
          </div>

          {/* Razorpay trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(124,58,237,0.15)' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Payments are <strong>100% secure</strong> and processed by <strong>Razorpay</strong>. Your card details are never stored.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={loading}>
              {loading
                ? <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <>Pay ₹{amount} <span style={{ fontSize: '11px', opacity: 0.8 }}>via Razorpay</span></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
