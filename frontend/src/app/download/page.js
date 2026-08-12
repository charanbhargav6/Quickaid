'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function DownloadPage() {
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        const fallbackUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quickaid-rho.vercel.app';
        setSiteUrl(fallbackUrl);
      } else {
        setSiteUrl(origin);
      }
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
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>🤖 For Android</h3>
              <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.6' }}>
                <li>Scan the QR code to download the APK.</li>
                <li>Tap <strong>Open</strong> when the download finishes.</li>
                <li>If prompted, allow <strong>"Install unknown apps"</strong> from your browser.</li>
                <li>Tap <strong>Install</strong> and you're ready to go!</li>
              </ol>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <a 
                href="https://github.com/charanbhargav6/Quickaid/releases/latest/download/app-release.apk"
                download
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 20 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download APK Directly
                </a>
            </div>
          </div>

          {/* QR Code Section */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Scan to Download APK</h2>
            <div style={{ 
              background: '#fff', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              marginBottom: '1rem'
            }}>
              <QRCodeSVG value="https://github.com/charanbhargav6/Quickaid/releases/latest/download/app-release.apk" size={180} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
