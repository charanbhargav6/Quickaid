'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { AnimatePresence } from 'framer-motion';
import AcceptTaskButton from '@/components/AcceptTaskButton';
import TaskReviewModal from '@/components/TaskReviewModal';

export default function RealtimeHelperTasks({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [myAcceptedTasks, setMyAcceptedTasks] = useState([]);
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewedTaskIds, setReviewedTaskIds] = useState(new Set());
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const currentUserId = React.useRef(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        currentUserId.current = user.id;
        // Fetch tasks I've accepted
        supabase
          .from('tasks')
          .select('*')
          .eq('helper_id', user.id)
          .in('status', ['accepted', 'completed', 'cancelled', 'disputed'])
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setMyAcceptedTasks(data);
          });
        // Fetch reviews I've already submitted (to show "Reviewed" badge)
        supabase
          .from('reviews')
          .select('task_id')
          .eq('reviewer_id', user.id)
          .then(({ data: reviewData }) => {
            if (reviewData) setReviewedTaskIds(new Set(reviewData.map(r => r.task_id)));
          });
      }
    });

    // Subscribe to open tasks
    const channel = supabase
      .channel('public:tasks:open')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
          setTasks((prev) => {
            if (currentUserId.current && payload.new.seeker_id === currentUserId.current) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status !== 'open') {
            setTasks((prev) => prev.filter(t => t.id !== payload.new.id));
            // If the current helper just accepted this task, add it to their active jobs immediately
            if (currentUserId.current && payload.new.helper_id === currentUserId.current && ['accepted', 'completed'].includes(payload.new.status)) {
              setMyAcceptedTasks((prev) => {
                if (prev.some(t => t.id === payload.new.id)) {
                  return prev.map(t => t.id === payload.new.id ? payload.new : t);
                }
                return [payload.new, ...prev];
              });
            }
          }
          // Update my accepted tasks
          if (payload.new.helper_id === currentUserId.current) {
            setMyAcceptedTasks((prev) => {
              const exists = prev.find(t => t.id === payload.new.id);
              if (exists) {
                return prev.map(t => t.id === payload.new.id ? payload.new : t);
              }
              return [payload.new, ...prev];
            });
            // Auto-prompt review when task is marked done by seeker
            if (payload.new.status === 'completed' || payload.new.status === 'cancelled') {
              setReviewTask(payload.new);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleMarkComplete = async (task) => {
    const supabase = createClient();
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    setReviewTask({ ...task, status: 'completed' });
  };

  const getTripDistance = (task) => {
    if (!task.lat || !task.lng || !task.destination_lat || !task.destination_lng) return null;
    const R = 6371; // km
    const dLat = (task.destination_lat - task.lat) * (Math.PI/180);
    const dLon = (task.destination_lng - task.lng) * (Math.PI/180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(task.lat * (Math.PI/180)) * Math.cos(task.destination_lat * (Math.PI/180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return (R * c).toFixed(1);
  };

  const CATEGORIES = [
    { value: 'all', label: 'All Tasks' },
    { value: 'delivery', label: '🚚 Delivery' },
    { value: 'physical', label: '🔧 Physical' },
    { value: 'digital', label: '💻 Digital' },
  ];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.task_type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openTasks = filteredTasks.length === 0 ? (
    <p style={{ color: 'var(--text-muted)' }}>{tasks.length === 0 ? 'No open tasks right now. Check back later!' : 'No tasks match your search.'}</p>
  ) : (
    filteredTasks.map(task => {
      const distance = getTripDistance(task);
      return (
      <div 
        key={task.id} 
        className="card" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid transparent' }}
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'none'}
        onClick={() => setSelectedTask(task)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{task.title}</h3>
          <span className="badge badge-blue">₹{task.pay?.toFixed(2) ?? task.price?.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {distance && (
            <span className="badge badge-gray" style={{ color: 'var(--primary)' }}>
              🛣️ ~{distance} km
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(task.created_at).toLocaleDateString()}</span>
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>View Details</button>
        </div>
      </div>
    )})
  );

  return (
    <>
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '180px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className="btn"
              style={{
                padding: '8px 14px', fontSize: '13px',
                background: selectedCategory === cat.value ? 'var(--primary)' : 'var(--card-bg)',
                color: selectedCategory === cat.value ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${selectedCategory === cat.value ? 'var(--primary)' : 'var(--border)'}`,
                fontWeight: selectedCategory === cat.value ? 600 : 400,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {(searchQuery || selectedCategory !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Open tasks grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {openTasks}
      </div>

      {/* My accepted/in-progress tasks */}
      {myAcceptedTasks.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>My Active Jobs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myAcceptedTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{task.title}</div>
                    {getTripDistance(task) && (
                      <span className="badge badge-gray" style={{ color: 'var(--primary)', padding: '2px 6px', fontSize: '11px' }}>
                        🛣️ {getTripDistance(task)} km
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '8px' }}>{task.description}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {task.location_name && <div>📍 <strong>Pickup:</strong> {task.location_name}</div>}
                    {task.destination_name && <div style={{ marginTop: '2px' }}>🏁 <strong>Dropoff:</strong> {task.destination_name}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${task.status === 'completed' ? 'badge-green' : task.status === 'cancelled' ? 'badge-gray' : 'badge-purple'}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {task.status === 'in_progress' && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '13px', padding: '6px 14px' }}
                      onClick={() => handleMarkComplete(task)}
                    >
                      ✅ Mark Complete
                    </button>
                  )}
                  {(task.status === 'completed' || task.status === 'cancelled') && (
                    reviewedTaskIds.has(task.id) ? (
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600 }}>
                        ✓ Reviewed
                      </span>
                    ) : (
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => setReviewTask(task)}
                      >
                        ⭐ Rate Seeker
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {reviewTask && (
          <TaskReviewModal
            task={reviewTask}
            reviewerRole="helper"
            onClose={() => setReviewTask(null)}
            onSubmitted={() => {
              setReviewedTaskIds(prev => new Set([...prev, reviewTask.id]));
              setReviewTask(null);
            }}
          />
        )}
        
        {selectedTask && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            padding: '1rem'
          }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--card-bg)', borderRadius: '20px' }}>
              
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Task Details</h2>
                <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
              </div>

              {/* Title + Price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, lineHeight: 1.2 }}>{selectedTask.title}</h3>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>₹{(selectedTask.pay ?? selectedTask.price ?? 0).toFixed(2)}</span>
              </div>
              
              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {selectedTask.category && <span className="badge badge-gray">{selectedTask.category.replace(/_/g, ' ').toUpperCase()}</span>}
                {selectedTask.task_type && <span className="badge badge-gray">{selectedTask.task_type.toUpperCase()}</span>}
                {getTripDistance(selectedTask) && (
                  <span className="badge badge-gray" style={{ color: 'var(--primary)' }}>🛣️ ~{getTripDistance(selectedTask)} km</span>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '15px' }}>{selectedTask.description}</p>
              </div>

              {/* Location info only for non-digital tasks */}
              {selectedTask.task_type !== 'digital' && (selectedTask.location_name || selectedTask.destination_name) && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedTask.destination_name ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '1.25rem' }}>
                  {selectedTask.location_name && (
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.06em' }}>📍 Pickup</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedTask.location_name}</div>
                    </div>
                  )}
                  {selectedTask.destination_name && (
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.06em' }}>🏁 Dropoff</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedTask.destination_name}</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedTask(null)}>Close</button>
                <div style={{ flex: 1 }}>
                  <AcceptTaskButton taskId={selectedTask.id} onSuccess={() => setSelectedTask(null)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
