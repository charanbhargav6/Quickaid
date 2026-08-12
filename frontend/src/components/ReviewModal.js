'use client';
import { useState, useEffect } from 'react';
import { submitReview } from '@/app/seeker/_actions/reviewActions';

export default function ReviewModal() {
  const [task, setTask] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOpen = (e) => {
      setTask(e.detail);
      setRating(5);
      setComment('');
      setError(null);
      setIsOpen(true);
    };

    window.addEventListener('open-review-modal', handleOpen);
    return () => window.removeEventListener('open-review-modal', handleOpen);
  }, []);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await submitReview({
      taskId: task.id,
      revieweeId: task.helper_id,
      rating,
      comment
    });

    setSubmitting(false);

    if (res.success) {
      setIsOpen(false);
      alert('Review submitted successfully!');
    } else {
      setError(res.error || 'Failed to submit review. You may have already reviewed this task.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="card fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '450px', position: 'relative', background: 'var(--card-bg)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(0,0,0,0.05)', border: 'none', fontSize: '1.25rem', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '1rem' }}>
            ⭐
          </div>
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '24px', fontWeight: 800 }}>Rate Helper</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>
            How was your experience for "{task.title}"?
          </p>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '14px', background: '#fee2e2', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 500 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '2.5rem',
                    cursor: 'pointer',
                    color: star <= rating ? '#fbbf24' : '#e5e7eb',
                    padding: 0,
                    transition: 'color 0.2s ease, transform 0.2s ease',
                    transform: star <= rating ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
              {rating <= 2 ? 'This will negatively impact their trust score.' : 'Great job!'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>Comment (Optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Tell others what you thought..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ resize: 'none', borderRadius: '12px', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting}
            style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold' }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
