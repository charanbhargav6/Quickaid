export default function HelperLoading() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ height: '32px', width: '200px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '40px', width: '140px', borderRadius: '8px' }} />
      </div>

      {/* Task cards skeleton grid */}
      <div className="skeleton" style={{ height: '20px', width: '180px', borderRadius: '6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ height: '22px', width: '60%', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '22px', width: '60px', borderRadius: '12px' }} />
            </div>
            <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
              <div className="skeleton" style={{ height: '14px', width: '80px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '36px', width: '110px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
