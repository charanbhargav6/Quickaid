'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

function ReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    } else {
      setError("No task ID provided.");
      setLoading(false);
    }
  }, [taskId]);

  async function fetchTask() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, helper:helper_id(full_name)`)
        .eq('id', taskId)
        .single();
        
      if (error) throw error;
      setTask(data);
    } catch (err) {
      console.error(err);
      setError("Task not found or failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!task || !task.helper_id) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("You must be logged in to leave a review.");

      // 1. Insert Review
      const { error: reviewError } = await supabase.from('reviews').insert({
        task_id: task.id,
        reviewer_id: user.id,
        reviewee_id: task.helper_id,
        rating: rating,
        comment: comment
      });

      if (reviewError) {
        // Fallback message if table doesn't exist
        if (reviewError.code === '42P01') {
          throw new Error("The 'reviews' table does not exist in your Supabase database. Please create it first!");
        }
        throw reviewError;
      }

      // 2. The database trigger 'trigger_update_trust_score' on the 'reviews' table
      // will now automatically calculate the average rating and update the 'trust_score' 
      // and 'total_reviews' securely on the server! No client-side profile update needed.

      toast.success("Review submitted successfully!");
      router.push('/seeker/tasks');
      
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while submitting your review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading task...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', border: '1px solid var(--red-500)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <h2 style={{ color: 'var(--red-500)', marginBottom: '1rem' }}>Error</h2>
          <p>{error}</p>
          <button className="btn btn-outline" onClick={() => router.push('/seeker')} style={{ marginTop: '1rem' }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }} className="fade-in">
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Leave a Review</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Rate your experience with <strong>{task.helper?.full_name || 'your helper'}</strong> for the task "{task.title}".
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Rating</label>
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
                  color: star <= rating ? '#fbbf24' : 'var(--border)',
                  transition: 'color 0.2s'
                }}
              >
                ★
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {rating} out of 5 stars
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Comments</label>
          <textarea
            className="input"
            rows="4"
            placeholder="What went well? What could be improved?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            style={{ resize: 'vertical' }}
          ></textarea>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={submitting}
          style={{ width: '100%', padding: '12px' }}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>}>
      <ReviewForm />
    </Suspense>
  );
}
