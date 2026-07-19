'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { postTask } from '@/app/seeker/_actions/taskActions';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

// Predefined job categories
const JOB_CATEGORIES = [
  { value: 'delivery', label: '📦 Delivery & Errands' },
  { value: 'moving', label: '🚚 Moving & Heavy Lifting' },
  { value: 'cleaning', label: '🧹 Cleaning & Organising' },
  { value: 'technical', label: '💻 Technical & IT Help' },
  { value: 'plumbing_repair', label: '🔧 Plumbing & Home Repair' },
  { value: 'assembly', label: '🪑 Furniture Assembly' },
  { value: 'other', label: '✏️ Other (describe below)' },
];

// Basic profanity filter — extend this list as needed
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

function PostTaskModalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mapPickerRef = useRef(null);

  const action = searchParams.get('action');

  const [showModal, setShowModal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [category, setCategory] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPrice, setTaskPrice] = useState('');
  const [taskLocationName, setTaskLocationName] = useState('');
  const [taskLocation, setTaskLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (action === 'create') setShowModal(true);
  }, [action]);

  // Auto-fetch location when modal opens
  useEffect(() => {
    if (!showModal) return;
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTaskLocation({ lat, lng });
        // Reverse geocode to get a human-readable name
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(r => r.json())
          .then(data => {
            const name = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.display_name?.split(',')[0] || 'Current Location';
            setTaskLocationName(name);
          })
          .catch(() => setTaskLocationName('Current Location'))
          .finally(() => setIsLocating(false));
      },
      () => {
        setIsLocating(false); // silently fail if denied
      },
      { timeout: 8000 }
    );
  }, [showModal]);

  const handleClose = () => {
    setShowModal(false);
    setCategory('');
    setCustomTitle('');
    setTaskDesc('');
    setTaskPrice('');
    setTaskLocationName('');
    setTaskLocation(null);
    setErrorMsg(null);
    if (action === 'create') router.replace(pathname);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isOther = category === 'other';
    const titleToUse = isOther ? customTitle.trim() : (JOB_CATEGORIES.find(c => c.value === category)?.label.replace(/^.{2}/, '').trim() ?? category);

    if (!category) {
      setErrorMsg('Please select a job category.');
      return;
    }
    if (isOther && !customTitle.trim()) {
      setErrorMsg('Please describe the job type.');
      return;
    }
    if (isOther && containsBlockedWord(customTitle)) {
      setErrorMsg('⚠️ Your job title contains inappropriate or sensitive content. Please rephrase it.');
      return;
    }
    if (!taskLocation) {
      setErrorMsg('Please drop a pin on the map to set the task location.');
      return;
    }

    setIsPending(true);
    setErrorMsg(null);

    const formData = {
      title: titleToUse,
      description: taskDesc,
      price: parseFloat(taskPrice),
      lat: taskLocation.lat,
      lng: taskLocation.lng,
      location_name: taskLocationName.trim() || 'Current Location',
      category,
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
          <div className="card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2rem', background: 'var(--card-bg)', borderRadius: '20px' }}>
            <h2 style={{ marginBottom: '0.5rem', marginTop: 0, fontSize: '22px', fontWeight: 800 }}>Post New Task</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 0, marginBottom: '1.5rem' }}>
              Describe what you need help with and set a location.
            </p>
            {errorMsg && (
              <div style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '14px', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Job Category <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  className="input"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setCustomTitle(''); }}
                  required
                  disabled={isPending}
                >
                  <option value="" disabled>Select a job type…</option>
                  {JOB_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom title — only shown if "Other" */}
              {category === 'other' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                    Describe the Job <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    required
                    placeholder="e.g. Need help painting a fence"
                    disabled={isPending}
                    maxLength={80}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Keep it clean and specific. Inappropriate titles will be blocked.
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <textarea
                  className="input"
                  rows="3"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  required
                  placeholder="Describe the task in detail…"
                  disabled={isPending}
                />
              </div>

              {/* Price */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input"
                  value={taskPrice}
                  onChange={e => setTaskPrice(e.target.value)}
                  required
                  placeholder="e.g. 500"
                  disabled={isPending}
                />
              </div>

              {/* Location Name */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Location Name
                  {isLocating && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>📍 Detecting your location…</span>}
                </label>
                <input
                  type="text"
                  className="input"
                  value={taskLocationName}
                  onChange={e => setTaskLocationName(e.target.value)}
                  placeholder="e.g. Building A, Room 101"
                  disabled={isPending}
                />
              </div>

              {/* Map */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Pin Location on Map {taskLocation ? <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓ Pinned</span> : ''}
                </label>
                <MapPicker onChange={setTaskLocation} initialLocation={taskLocation} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={handleClose} disabled={isPending}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isPending}>
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
