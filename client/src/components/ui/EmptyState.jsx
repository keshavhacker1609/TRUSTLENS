import React from 'react';

export default function EmptyState({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 20, opacity: 0.3 }}>
        <circle cx="28" cy="28" r="18" stroke="var(--text-2)" strokeWidth="2.5"/>
        <path d="M41 41L54 54" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M28 21v7M28 31.5v1" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', maxWidth: 320, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
      {action && (
        <div style={{ marginTop: 20 }}>
          {action}
        </div>
      )}
    </div>
  );
}
