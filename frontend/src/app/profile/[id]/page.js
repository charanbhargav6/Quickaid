import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload';

export default async function ProfilePage({ params }) {
  const supabase = await createClient();
  const { id } = await params;
  
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === id;

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
    .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
    .eq('reviewee_id', id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const totalReviews = reviews?.length || 0;
  const trustScore = profile.trust_score || 50;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      <Link href={isOwner ? (profile.role === 'seeker' ? "/seeker" : "/helper") : "javascript:history.back()"} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', fontWeight: 600, padding: '8px 16px', background: 'var(--primary-light)', borderRadius: '20px' }}>
        ← Back
      </Link>

      <div className="card fade-in" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(145deg, var(--card-bg) 0%, var(--bg-secondary) 100%)', border: '1px solid var(--border)' }}>
        <AvatarUpload profile={profile} isOwner={isOwner} />
        
        <h1 style={{ margin: '0 0 0.75rem 0', fontSize: '32px', fontWeight: 800 }}>{profile.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-green" style={{ fontSize: '14px', padding: '6px 12px' }}>Verified</span>
          <span className="badge badge-blue" style={{ fontSize: '14px', padding: '6px 12px' }}>{profile.role?.toUpperCase()}</span>
          {trustScore < 50 && trustScore >= 30 && (
            <span className="badge badge-red" style={{ fontSize: '14px', padding: '6px 12px' }}>⚠️ Warning</span>
          )}
          {profile.is_suspended && (
            <span className="badge badge-red" style={{ fontSize: '14px', padding: '6px 12px' }}>Suspended</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>Trust Score</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: trustScore >= 80 ? '#10b981' : trustScore >= 50 ? '#f59e0b' : '#ef4444' }}>
              {trustScore} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
          </div>
          
          <div style={{ flex: '1 1 150px', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>Total Reviews</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-dark)' }}>{totalReviews}</div>
          </div>
          
          <div style={{ flex: '1 1 150px', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>Tasks Completed</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-dark)' }}>{profile.tasks_completed || 0}</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '1.5rem' }}>Recent Reviews</h2>
      
      {totalReviews === 0 ? (
        <div className="card fade-in" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⭐</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>No reviews yet</div>
          <div style={{ marginTop: '8px' }}>When someone leaves a review, it will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {reviews.map((review, index) => (
            <div key={review.id} className="card fade-in" style={{ padding: '2rem', animationDelay: `${index * 0.1}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', overflow: 'hidden' }}>
                  {review.reviewer?.avatar_url ? (
                     <img src={review.reviewer.avatar_url} alt="Reviewer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                     review.reviewer?.full_name ? review.reviewer.full_name[0] : 'A'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{review.reviewer?.full_name || 'Anonymous User'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>
                      {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                    {[1,2,3,4,5].map(star => (
                      <span key={star} style={{ color: star <= review.rating ? '#fbbf24' : '#e5e7eb' }}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              
              {review.comment && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>
                  "{review.comment}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
