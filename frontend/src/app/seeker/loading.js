export default function SeekerLoading() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ height: '32px', width: '220px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '40px', width: '140px', borderRadius: '8px' }} />
      </div>

      {/* Active Helpers skeleton */}
      <div className="skeleton" style={{ height: '20px', width: '200px', borderRadius: '6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton" style={{ height: '14px', width: '80%', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* My Tasks skeleton */}
      <div className="skeleton" style={{ height: '20px', width: '160px', borderRadius: '6px', marginTop: '0.5rem' }} />
      <div className="card" style={{ padding: '1.5rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <div className="skeleton" style={{ height: '16px', width: '55%', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
            </div>
            <div className="skeleton" style={{ height: '24px', width: '70px', borderRadius: '12px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
