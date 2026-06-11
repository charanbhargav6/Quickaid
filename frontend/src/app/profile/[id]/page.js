import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ProfilePage({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) {
    notFound();
  }

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name)')
    .eq('reviewee_id', id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const totalReviews = reviews?.length || 0;
  const trustScore = profile.trust_score || 50;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      <Link href="/seeker" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '2rem', fontWeight: 600 }}>
        ← Back to Dashboard
      </Link>

      <div className="card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {profile.full_name ? profile.full_name[0] : 'U'}
        </div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '28px' }}>{profile.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span className="badge badge-green">Verified</span>
          <span className="badge badge-blue">{profile.role?.toUpperCase()}</span>
          {trustScore < 50 && trustScore >= 30 && (
            <span className="badge badge-red">⚠️ Warning</span>
          )}
          {profile.is_suspended && (
            <span className="badge badge-red">Suspended</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '3rem', marginTop: '1rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', width: '100%', justifyContent: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Trust Score</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: trustScore >= 80 ? '#10b981' : trustScore >= 50 ? '#f59e0b' : '#ef4444' }}>
              {trustScore} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }}></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Total Reviews</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-dark)' }}>{totalReviews}</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }}></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Tasks Completed</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-dark)' }}>{profile.tasks_completed || 0}</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', marginBottom: '1.5rem' }}>Recent Reviews</h2>
      
      {totalReviews === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          This user doesn't have any reviews yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600 }}>{review.reviewer?.full_name || 'Anonymous'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '0.5rem', fontSize: '18px' }}>
                {[1,2,3,4,5].map(star => (
                  <span key={star} style={{ color: star <= review.rating ? '#fbbf24' : '#e5e7eb' }}>★</span>
                ))}
              </div>
              {review.comment && (
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  "{review.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
