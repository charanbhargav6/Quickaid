'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function DownloadPage() {
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Get <span style={{ color: 'var(--primary)' }}>QuickAid</span> on your Phone
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          QuickAid is a Progressive Web App (PWA). You can install it directly from your browser without needing an app store!
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: '2rem', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          
          {/* Instructions Section */}
          <div style={{ flex: '1 1 300px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>How to Install</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>🟢 For Android (Chrome)</h3>
              <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <li>Open QuickAid in Chrome on your phone.</li>
                <li>Tap the 3-dot menu icon in the top right.</li>
                <li>Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</li>
              </ol>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>🍎 For iOS (Safari)</h3>
              <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <li>Open QuickAid in Safari on your iPhone.</li>
                <li>Tap the Share icon (square with an up arrow) at the bottom.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
              </ol>
            </div>
          </div>

          {/* QR Code Section */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Scan to Open on Phone</h2>
            <div style={{ 
              background: '#fff', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              {siteUrl ? (
                <QRCodeSVG value={siteUrl} size={180} />
              ) : (
                <div style={{ width: 180, height: 180, background: '#f5f5f5', borderRadius: 8 }}></div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
