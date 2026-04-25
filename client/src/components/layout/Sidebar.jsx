import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    to: '/claims',
    label: 'Claims',
    end: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2.5A1.5 1.5 0 014.5 1h7A1.5 1.5 0 0113 2.5v11a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13.5v-11z" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5.5 5.5h5M5.5 8h3.5M5.5 10.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    end: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12.5l3.5-4 3 2.5 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 14.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/analyze',
    label: 'Run Analysis',
    end: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M7 5v4M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <aside style={{
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--surface-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 18px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 34,
          height: 34,
          background: 'linear-gradient(135deg, var(--cyan) 0%, #0070cc 100%)',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 800,
          fontSize: 12,
          color: '#05080f',
          flexShrink: 0,
          boxShadow: '0 0 16px rgba(0,200,240,0.25)',
        }}>
          TL
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-1)' }}>
            TRUSTLENS
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.07em', marginTop: 1 }}>
            FRAUD INTELLIGENCE
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ padding: '14px 18px 6px' }}>
        <span className="section-label">Navigation</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--cyan)' : 'var(--text-2)',
              background: isActive ? 'var(--cyan-glow)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--cyan-border)' : 'transparent'}`,
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.color = 'var(--text-1)';
                e.currentTarget.style.background = 'var(--surface-2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.color = '';
                e.currentTarget.style.background = '';
              }
            }}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* System section */}
      <div style={{ padding: '8px 10px 4px', borderTop: '1px solid var(--border)' }}>
        <span className="section-label" style={{ padding: '6px 8px', display: 'block' }}>System</span>
        {/* ML Status indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--green-bg)',
          border: '1px solid var(--green-border)',
          marginBottom: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pulseDot 3s ease infinite' }} />
          <span style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>ML Engine Online</span>
        </div>
      </div>

      {/* User section */}
      {user && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--surface-3) 0%, var(--surface-active) 100%)',
              border: '1.5px solid var(--cyan-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--cyan)',
              flexShrink: 0,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.name || user.email}
              </div>
              <span style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: user.role === 'admin' ? 'var(--cyan)' : 'var(--text-3)',
                background: user.role === 'admin' ? 'var(--cyan-glow)' : 'var(--surface-3)',
                border: `1px solid ${user.role === 'admin' ? 'var(--cyan-border)' : 'var(--border)'}`,
                borderRadius: 999,
                padding: '1px 7px',
              }}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', fontSize: 11.5, gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 001 3.5v6A1.5 1.5 0 002.5 11H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M8.5 9L11 6.5 8.5 4M11 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
