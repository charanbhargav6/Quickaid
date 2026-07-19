'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function TaskReviewModal({ task, reviewerRole, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating before submitting.');
      return;
    }
    setIsPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine who is being reviewed
      const reviewedId = reviewerRole === 'seeker' ? task.helper_id : task.seeker_id;

      // Insert review
      const { error: reviewError } = await supabase.from('reviews').insert({
        task_id: task.id,
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        rating,
        comment: comment.trim(),
        reviewer_role: reviewerRole,
      });
      if (reviewError) throw reviewError;

      // Update trust score on the reviewed profile (weighted average)
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_score, total_reviews')
        .eq('id', reviewedId)
        .single();

      if (profile) {
        const prevScore = parseFloat(profile.trust_score ?? 5);
        const prevCount = parseInt(profile.total_reviews ?? 0);
        const newCount = prevCount + 1;
        const newScore = ((prevScore * prevCount) + rating) / newCount;

        await supabase.from('profiles').update({
          trust_score: Math.round(newScore * 10) / 10,
          total_reviews: newCount,
        }).eq('id', reviewedId);
      }

      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review. Please try again.');
      setIsPending(false);
    }
  };

  const targetLabel = reviewerRole === 'seeker' ? 'the Helper' : 'the Seeker';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card fade-in" style={{
        width: '100%', maxWidth: '440px', padding: '2rem',
        background: 'var(--card-bg)', borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>⭐</div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Rate your experience</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '14px' }}>
            Task: <strong>{task.title}</strong> — Please rate {targetLabel}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Star Rating */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '36px', padding: '4px',
                    color: star <= (hoveredRating || rating) ? '#F59E0B' : 'var(--border)',
                    transition: 'color 0.15s, transform 0.15s',
                    transform: star <= (hoveredRating || rating) ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {rating === 0 ? 'Tap a star to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Leave a comment <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder={`How was your experience with ${targetLabel}?`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isPending}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: '13px', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={isPending}
            >
              Skip for now
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isPending}
            >
              {isPending ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
