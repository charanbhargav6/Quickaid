'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { acceptOffer } from '@/app/seeker/_actions/taskActions';
import toast from 'react-hot-toast';

export default function IncomingOffers({ userId }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const fetchOffers = async () => {
    // Fetch pending offers for tasks owned by the current seeker
    const { data, error } = await supabase
      .from('task_offers')
      .select('*, tasks!inner(*), profiles:helper_id(full_name, trust_score)')
      .eq('status', 'pending')
      .eq('tasks.seeker_id', userId);

    if (data) setOffers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();

    const channel = supabase.channel('public:task_offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_offers' }, payload => {
        fetchOffers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAccept = async (offerId) => {
    if (isAccepting) return;
    if (!confirm("Are you sure you want to accept this offer?")) return;
    setIsAccepting(true);
    const res = await acceptOffer({ offerId });
    if (res.success) {
      toast.success("Offer accepted successfully!");
      setOffers(offers.filter(o => o.id !== offerId));
    } else {
      toast.error(res.error || "Failed to accept offer.");
    }
    setIsAccepting(false);
  };

  if (loading) return <div className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>;
  if (offers.length === 0) return null; // Hide if no offers

  return (
    <section style={{ marginBottom: '2rem' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ color: 'var(--primary)' }}>🔔 Incoming Counter-Offers</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {offers.map(offer => (
          <div key={offer.id} className="card" style={{ borderLeft: '4px solid var(--primary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{offer.tasks?.title}</h3>
              <span className="badge badge-yellow">Pending</span>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
              <strong>{offer.profiles?.full_name}</strong> (Trust Score: {offer.profiles?.trust_score}/100) proposed a new price.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>₹{offer.tasks?.pay}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{offer.proposed_pay}</div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', opacity: isAccepting ? 0.7 : 1 }} 
              disabled={isAccepting}
              onClick={() => handleAccept(offer.id)}
            >
              {isAccepting ? 'Accepting...' : 'Accept Offer'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
