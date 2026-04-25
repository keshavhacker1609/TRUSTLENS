import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';

const PAGE_META = {
  '/': { title: 'Dashboard', crumbs: ['Dashboard'] },
  '/claims': { title: 'Claims', crumbs: ['Dashboard', 'Claims'] },
  '/analyze': { title: 'Analyze', crumbs: ['Dashboard', 'Analyze'] },
};

export default function TopBar() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const liveClaimsCount = useUIStore((s) => s.liveClaimsCount);
  const resetLiveCount = useUIStore((s) => s.resetLiveCount);

  const isDetail = location.pathname.startsWith('/claims/') && location.pathname !== '/claims';
  const meta = isDetail
    ? { title: 'Claim Detail', crumbs: ['Dashboard', 'Claims', 'Detail'] }
    : (PAGE_META[location.pathname] || { title: 'TrustLens', crumbs: ['Dashboard'] });

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-w)',
      right: 0,
      height: 'var(--topbar-h)',
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 40,
    }}>
      {/* Left: breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {meta.crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>/</span>
            )}
            <span style={{
              fontSize: i === meta.crumbs.length - 1 ? 14 : 13,
              fontWeight: i === meta.crumbs.length - 1 ? 600 : 400,
              color: i === meta.crumbs.length - 1 ? 'var(--text-1)' : 'var(--text-3)',
            }}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right: user + live counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Live claims notification */}
        {liveClaimsCount > 0 && (
          <button
            onClick={resetLiveCount}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              borderRadius: 999,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--red)',
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--red)',
              animation: 'pulseDot 1.5s ease infinite',
              display: 'inline-block',
            }} />
            {liveClaimsCount} new claim{liveClaimsCount !== 1 ? 's' : ''}
          </button>
        )}

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--cyan)',
            }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
