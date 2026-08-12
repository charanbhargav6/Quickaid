import React from 'react';
import Link from 'next/link';

export default function AlertModal({ 
  isOpen, 
  title, 
  message, 
  type = 'info', // 'danger', 'warning', 'success', 'info'
  primaryActionText = 'Ok',
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  primaryActionHref // If this exists, the primary button acts as a Next.js Link
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '12px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        );
      case 'warning':
        return (
          <div style={{ background: '#FEF3C7', color: '#F59E0B', padding: '12px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        );
      case 'success':
        return (
          <div style={{ background: '#D1FAE5', color: '#10B981', padding: '12px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
        );
      default:
        return (
          <div style={{ background: '#DBEAFE', color: '#3B82F6', padding: '12px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
        );
    }
  };

  const getPrimaryButtonColor = () => {
    switch (type) {
      case 'danger': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      default: return '#3B82F6';
    }
  };

  const PrimaryButtonContent = (
    <button
      onClick={!primaryActionHref ? onPrimaryAction : undefined}
      style={{
        flex: 1,
        padding: '12px 20px',
        background: getPrimaryButtonColor(),
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '15px',
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        width: '100%'
      }}
      onMouseOver={e => e.currentTarget.style.opacity = 0.9}
      onMouseOut={e => e.currentTarget.style.opacity = 1}
    >
      {primaryActionText}
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="fade-in"
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '32px 24px',
          width: '100%',
          maxWidth: '380px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {getIcon()}
        
        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
          {title}
        </h3>
        
        <p style={{ margin: '0 0 28px 0', color: '#64748B', fontSize: '15px', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          {secondaryActionText && (
            <button
              onClick={onSecondaryAction}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: '#F1F5F9',
                color: '#475569',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
              onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
            >
              {secondaryActionText}
            </button>
          )}

          <div style={{ flex: 1 }}>
            {primaryActionHref ? (
              <Link href={primaryActionHref} style={{ textDecoration: 'none' }} onClick={onPrimaryAction}>
                {PrimaryButtonContent}
              </Link>
            ) : (
              PrimaryButtonContent
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
