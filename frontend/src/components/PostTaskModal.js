'use client';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { postTask } from '@/app/seeker/_actions/taskActions';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

const JOB_CATEGORIES = {
  physical: [
    { value: 'moving', label: '🚚 Moving & Heavy Lifting' },
    { value: 'cleaning', label: '🧹 Cleaning & Organising' },
    { value: 'plumbing_repair', label: '🔧 Plumbing & Home Repair' },
    { value: 'assembly', label: '🪑 Furniture Assembly' },
    { value: 'other_physical', label: '✏️ Other Physical Task' },
  ],
  delivery: [
    { value: 'delivery', label: '📦 Delivery & Errands' },
    { value: 'other_delivery', label: '✏️ Other Delivery Task' },
  ],
  digital: [
    { value: 'technical', label: '💻 Technical & IT Help' },
    { value: 'design', label: '🎨 Design & Editing' },
    { value: 'other_digital', label: '✏️ Other Digital Task' },
  ]
};

const BLOCKED_WORDS = [
  'sex', 'xxx', 'porn', 'nude', 'escort', 'prostitut',
  'drugs', 'weed', 'cocaine', 'heroin', 'meth', 'murder',
  'kill', 'hack', 'illegal', 'bomb', 'weapon', 'gun',
  'nsfw', 'adult', 'onlyfans',
];

function containsBlockedWord(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

// Haversine distance calculation in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function PostTaskModalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const action = searchParams.get('action');

  const [showModal, setShowModal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [taskType, setTaskType] = useState('physical'); // physical, delivery, digital
  const [category, setCategory] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  
  // Pricing
  const [taskPrice, setTaskPrice] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Locations
  const [taskLocationName, setTaskLocationName] = useState('');
  const [taskLocation, setTaskLocation] = useState(null);
  
  const [destinationName, setDestinationName] = useState('');
  const [destinationLocation, setDestinationLocation] = useState(null);
  
  const [placingDestination, setPlacingDestination] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (action === 'create') setShowModal(true);
  }, [action]);

  // Reset fields when task type changes
  useEffect(() => {
    setCategory('');
    setCustomTitle('');
    if (taskType === 'digital') {
      setTaskPrice('');
    }
  }, [taskType]);

  // Auto-fetch location when modal opens (only for non-digital)
  useEffect(() => {
    if (!showModal) return;
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTaskLocation({ lat, lng });
        reverseGeocode(lat, lng).then(name => setTaskLocationName(name));
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  }, [showModal]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.display_name?.split(',')[0] || 'Selected Location';
    } catch (e) {
      return 'Selected Location';
    }
  };

  // Reverse geocode when map pins change manually
  useEffect(() => {
    if (taskLocation) {
      reverseGeocode(taskLocation.lat, taskLocation.lng).then(name => setTaskLocationName(name));
    }
  }, [taskLocation]);

  useEffect(() => {
    if (destinationLocation) {
      reverseGeocode(destinationLocation.lat, destinationLocation.lng).then(name => setDestinationName(name));
    }
  }, [destinationLocation]);

  // Auto-calculate Delivery Price
  useEffect(() => {
    if (taskType === 'delivery' && taskLocation && destinationLocation) {
      const dist = calculateDistance(taskLocation.lat, taskLocation.lng, destinationLocation.lat, destinationLocation.lng);
      // Base Fare ₹25 + ₹12/km
      const fare = Math.round(25 + (dist * 12));
      setCalculatedPrice(Math.max(30, fare)); // Minimum 30
      setTaskPrice(Math.max(30, fare).toString());
    } else if (taskType === 'delivery') {
      setCalculatedPrice(0);
      setTaskPrice('');
    }
  }, [taskLocation, destinationLocation, taskType]);

  const handleClose = () => {
    setShowModal(false);
    setTaskType('physical');
    setCategory('');
    setCustomTitle('');
    setTaskDesc('');
    setTaskPrice('');
    setTaskLocationName('');
    setTaskLocation(null);
    setDestinationName('');
    setDestinationLocation(null);
    setErrorMsg(null);
    if (action === 'create') router.replace(pathname);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isOther = category.startsWith('other');
    const titleToUse = isOther ? customTitle.trim() : (JOB_CATEGORIES[taskType].find(c => c.value === category)?.label.replace(/^.{2}/, '').trim() ?? category);

    if (!category) return setErrorMsg('Please select a job category.');
    if (isOther && !customTitle.trim()) return setErrorMsg('Please describe the job type.');
    if (isOther && containsBlockedWord(customTitle)) return setErrorMsg('⚠️ Your job title contains inappropriate content.');
    
    if (taskType !== 'digital') {
      if (!taskLocation) return setErrorMsg('Please drop a pin on the map for the location.');
      if (taskType === 'delivery' && !destinationLocation) return setErrorMsg('Please drop a destination pin for delivery.');
    }

    const finalPrice = parseFloat(taskPrice);
    if (isNaN(finalPrice) || finalPrice <= 0) return setErrorMsg('Please enter a valid price.');

    setIsPending(true);
    setErrorMsg(null);

    const formData = {
      title: titleToUse,
      description: taskDesc,
      price: finalPrice,
      task_type: taskType,
      category,
      lat: taskLocation?.lat,
      lng: taskLocation?.lng,
      location_name: taskType === 'digital' ? null : taskLocationName.trim(),
      destination_lat: destinationLocation?.lat,
      destination_lng: destinationLocation?.lng,
      destination_name: taskType === 'delivery' ? destinationName.trim() : null,
    };

    const res = await postTask(formData);

    if (!res.success) {
      setErrorMsg(res.error);
      setIsPending(false);
    } else {
      handleClose();
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Post New Task</button>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          overflowY: 'auto', padding: '1rem',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--card-bg)', borderRadius: '20px' }}>
            <h2 style={{ marginBottom: '0.5rem', marginTop: 0, fontSize: '22px', fontWeight: 800 }}>Post New Task</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 0, marginBottom: '1.5rem' }}>
              Describe what you need help with and set your pricing.
            </p>
            {errorMsg && (
              <div style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '14px', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Task Type Selector */}
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '4px' }}>
                {['physical', 'delivery', 'digital'].map(type => (
                  <button
                    key={type} type="button"
                    onClick={() => setTaskType(type)}
                    style={{
                      flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                      background: taskType === type ? '#fff' : 'transparent',
                      color: taskType === type ? '#0F172A' : '#64748B',
                      fontWeight: taskType === type ? 600 : 500,
                      boxShadow: taskType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer', textTransform: 'capitalize'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Category *</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)} required disabled={isPending}>
                  <option value="" disabled>Select a job type…</option>
                  {JOB_CATEGORIES[taskType].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Custom title */}
              {category.startsWith('other') && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Describe the Job *</label>
                  <input type="text" className="input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} required disabled={isPending} maxLength={80} />
                </div>
              )}

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <textarea className="input" rows="3" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} required disabled={isPending} />
              </div>

              {/* Map & Locations (Only if NOT digital) */}
              {taskType !== 'digital' && (
                <>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{taskType === 'delivery' ? 'Pickup Location' : 'Location Name'}</label>
                      <input type="text" className="input" value={taskLocationName} onChange={e => setTaskLocationName(e.target.value)} disabled={isPending} />
                    </div>
                    {taskType === 'delivery' && (
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Dropoff Location</label>
                        <input type="text" className="input" value={destinationName} onChange={e => setDestinationName(e.target.value)} disabled={isPending} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Pin Location on Map</label>
                      {taskType === 'delivery' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => setPlacingDestination(false)} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #3B82F6', background: !placingDestination ? '#DBEAFE' : 'transparent' }}>Set Pickup</button>
                          <button type="button" onClick={() => setPlacingDestination(true)} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #EF4444', background: placingDestination ? '#FEE2E2' : 'transparent' }}>Set Dropoff</button>
                        </div>
                      )}
                    </div>
                    <MapPicker 
                      taskType={taskType}
                      position={taskLocation} setPosition={setTaskLocation}
                      destination={destinationLocation} setDestination={setDestinationLocation}
                      placingDestination={placingDestination}
                      initialLocation={taskLocation} 
                    />
                  </div>
                </>
              )}

              {/* Price */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Price (₹)</label>
                {taskType === 'delivery' ? (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
                    {calculatedPrice > 0 ? (
                      <>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>₹{calculatedPrice}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Auto-calculated based on distance (Base ₹25 + ₹12/km).</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '14px', color: '#64748B' }}>Drop both pins to calculate price automatically.</div>
                    )}
                  </div>
                ) : (
                  <input type="number" step="1" min="1" className="input" value={taskPrice} onChange={e => setTaskPrice(e.target.value)} required placeholder="e.g. 150" disabled={isPending} />
                )}
                {taskPrice && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Helper receives <b>₹{Math.round(taskPrice * 0.95)}</b> (5% Platform Fee deducted from payout).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={handleClose} disabled={isPending}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isPending || (taskType === 'delivery' && calculatedPrice === 0)}>
                  {isPending ? 'Posting…' : 'Post Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function PostTaskModal() {
  return (
    <Suspense fallback={<button className="btn btn-primary">+ Post New Task</button>}>
      <PostTaskModalContent />
    </Suspense>
  );
}
