'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();

    // Real-time: auto-update when a new review is inserted
    const channel = supabase
      .channel('admin-reviews-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
      }, async (payload) => {
        // Fetch full review with joined names
        const { data } = await supabase
          .from('reviews')
          .select(`*, reviewer:reviewer_id(full_name, role), reviewee:reviewee_id(full_name, role), tasks(title)`)
          .eq('id', payload.new.id)
          .single();
        if (data) {
          setReviews(prev => [data, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchReviews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id(full_name, role),
          reviewee:reviewee_id(full_name, role),
          tasks(title)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Platform Reviews</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Monitor all feedback and ratings between seekers and helpers. Updates in real-time.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
          Live
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>DATE</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>REVIEWER</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>REVIEWED</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>TASK</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>RATING</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>COMMENT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No reviews yet.</td></tr>
            ) : (
              reviews.map(review => (
                <tr key={review.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {review.reviewer?.full_name || 'Unknown'}
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{review.reviewer?.role}</span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {review.reviewee?.full_name || 'Unknown'}
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{review.reviewee?.role}</span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    {review.tasks?.title || 'Unknown Task'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', color: '#fbbf24', fontSize: '16px' }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    {review.comment || <em>No comment provided.</em>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
