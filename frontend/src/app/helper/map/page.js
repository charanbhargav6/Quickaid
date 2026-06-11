'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { acceptTask, submitOffer } from '@/app/helper/_actions/helperActions';
import { useRouter } from 'next/navigation';

const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 'calc(100vh - 150px)', borderRadius: '16px' }}></div> });

export default function MapPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [user, setUser] = useState(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minPay, setMinPay] = useState('');

  // Offer State
  const [offerTask, setOfferTask] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const fetchTasks = async (lat, lng, radius, helperId, search, cat, pay) => {
    setLoading(true);
    const params = {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius,
      p_helper_id: helperId
    };
    if (search) params.p_search_query = search;
    if (cat) params.p_category = cat;
    if (pay) params.p_min_pay = Number(pay);

    const { data, error } = await supabase.rpc('get_nearby_tasks', params);
      
    if (data) setTasks(data);
    else if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation([latitude, longitude]);
        setErrorMsg(null);
        fetchTasks(latitude, longitude, radiusKm, user.id, searchQuery, category, minPay);
      },
      (error) => {
        console.error("Error getting location:", error);
        setErrorMsg('Please allow location access to see tasks near you.');
        setLoading(false);
      }
    );
  }, [user, radiusKm, searchQuery, category, minPay]);

  useEffect(() => {
    if (!location || !user) return;
    
    // Subscribe to real-time changes so pins appear instantly
    const channel = supabase.channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        fetchTasks(location[0], location[1], radiusKm, user.id, searchQuery, category, minPay);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location, radiusKm, user, searchQuery, category, minPay]);

  const handleAcceptTask = async (taskId) => {
    const res = await acceptTask({ taskId });
    if (res.success) {
      alert("Task accepted! Redirecting to My Tasks...");
      router.push('/helper/tasks');
    } else {
      alert(res.error || "Failed to accept task.");
    }
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || Number(offerAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    const res = await submitOffer({ taskId: offerTask.id, proposedPay: Number(offerAmount) });
    if (res.success) {
      alert("Offer submitted! The seeker will review your offer.");
      setOfferTask(null);
      setOfferAmount('');
    } else {
      alert(res.error || "Failed to submit offer.");
    }
  };

  if (errorMsg) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📍</div>
        <h1 style={{ fontSize: '24px', marginBottom: '1rem' }}>Location Required</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Live Task Map 🗺️</h1>
          <p style={{ color: 'var(--text-muted)' }}>Find open tasks near your location and accept them instantly.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={radiusKm} 
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="input"
            style={{ width: 'auto', padding: '0.5rem' }}
          >
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
          </select>
          <div style={{ background: 'var(--blue-50)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'var(--primary)', fontWeight: 600 }}>
            {loading ? '...' : tasks.length} Open Tasks
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search tasks..." 
          className="input" 
          style={{ flex: 1, minWidth: '200px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select 
          className="input" 
          style={{ width: '200px' }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Cleaning">Cleaning</option>
          <option value="Delivery">Delivery</option>
          <option value="Tech Support">Tech Support</option>
          <option value="Handyman">Handyman</option>
          <option value="Other">Other</option>
        </select>
        <input 
          type="number" 
          placeholder="Min Pay (₹)" 
          className="input" 
          style={{ width: '150px' }}
          value={minPay}
          onChange={(e) => setMinPay(e.target.value)}
        />
      </div>
      
      {loading && !location ? (
        <div className="skeleton" style={{ height: 'calc(100vh - 150px)', borderRadius: '16px' }}></div>
      ) : (
        <LiveMap tasks={tasks} onAccept={handleAcceptTask} onCounterOffer={setOfferTask} userLocation={location} />
      )}

      {offerTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Counter Offer</h3>
            <p>Task: <strong>{offerTask.title}</strong></p>
            <p>Original Pay: ₹{offerTask.pay}</p>
            <input 
              type="number" 
              className="input" 
              placeholder="Your proposed pay (₹)" 
              value={offerAmount} 
              onChange={(e) => setOfferAmount(e.target.value)} 
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setOfferTask(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitOffer}>Submit Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
