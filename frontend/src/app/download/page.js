'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function DownloadPage() {
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    // Dynamically build the full URL based on the current window location
    if (typeof window !== 'undefined') {
      setDownloadUrl(`${window.location.origin}/downloads/QuickAid.apk`);
    }
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Get <span className="primary-text">QuickAid</span> for Mobile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          Experience the full power of QuickAid on the go. Whether you're posting tasks or helping out, the mobile app is your best companion.
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: '2rem', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          
          {/* Download Button Section */}
          <div style={{ flex: '1 1 300px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Direct Download (Android)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Download the APK directly to your device and install it manually. 
            </p>
            <a 
              href="/downloads/QuickAid.apk" 
              download 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download APK
            </a>
          </div>

          {/* QR Code Section */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Scan to Download on Phone</h2>
            <div style={{ 
              background: '#fff', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              {downloadUrl ? (
                <QRCodeSVG value={downloadUrl} size={180} />
              ) : (
                <div style={{ width: 180, height: 180, background: '#f5f5f5', borderRadius: 8 }}></div>
              )}
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div style={{ marginTop: '4rem', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            How to Install
          </h3>
          <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li style={{ marginBottom: '0.5rem' }}>Click the <strong>Download APK</strong> button above, or scan the QR code with your phone.</li>
            <li style={{ marginBottom: '0.5rem' }}>Once downloaded, tap on the `QuickAid.apk` file to open it.</li>
            <li style={{ marginBottom: '0.5rem' }}>If prompted, go to your phone's Settings and enable <strong>"Install Unknown Apps"</strong> for your browser or file manager.</li>
            <li style={{ marginBottom: '0.5rem' }}>Confirm the installation and open the app!</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
