'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { postTask } from '@/app/seeker/_actions/taskActions';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

export default function PostTaskModal() {
  const [showModal, setShowModal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPrice, setTaskPrice] = useState('');
  const [taskLocation, setTaskLocation] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskLocation) {
      setErrorMsg("Please drop a pin on the map to set the task location.");
      return;
    }

    setIsPending(true);
    setErrorMsg(null);

    const formData = {
      title: taskTitle,
      description: taskDesc,
      price: parseFloat(taskPrice),
      lat: taskLocation.lat,
      lng: taskLocation.lng,
    };

    const res = await postTask(formData);
    
    if (!res.success) {
      setErrorMsg(res.error);
      setIsPending(false);
    } else {
      // Success! Close modal and reset
      setShowModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPrice('');
      setIsPending(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Post New Task</button>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', background: 'var(--card-bg)' }}>
            <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>Post New Task</h2>
            {errorMsg && <div style={{ color: '#F44336', marginBottom: '1rem', fontSize: '14px' }}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Title</label>
                <input type="text" className="input" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required placeholder="e.g. Need help carrying boxes" disabled={isPending} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
                <textarea className="input" rows="3" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} required placeholder="Describe the task..." disabled={isPending}></textarea>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Price (₹)</label>
                <input type="number" step="0.01" className="input" value={taskPrice} onChange={e => setTaskPrice(e.target.value)} required placeholder="500.00" disabled={isPending} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Location</label>
                <MapPicker onChange={setTaskLocation} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={isPending}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isPending}>
                  {isPending ? 'Posting...' : 'Post Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
