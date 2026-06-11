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
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ×
        </button>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Rate Helper</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '14px' }}>
          Leave a review for task "{task.title}"
        </p>

        {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '14px', background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Rating</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    color: star <= rating ? '#fbbf24' : '#e5e7eb',
                    padding: 0
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {rating <= 2 ? 'This will negatively impact their trust score.' : 'Great job!'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Comment (Optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="How did they do?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting}
            style={{ marginTop: '1rem' }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
