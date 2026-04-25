import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const navStyle = {
  background: '#0d1220',
  borderBottom: '1px solid #1f2937',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  height: '60px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const logoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginRight: '40px',
  textDecoration: 'none',
};

const linkStyle = {
  color: '#9ca3af',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  padding: '6px 14px',
  borderRadius: '6px',
  transition: 'all 0.2s',
};

const activeLinkStyle = {
  ...linkStyle,
  color: '#00e5ff',
  background: 'rgba(0, 229, 255, 0.08)',
};

export default function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <nav style={navStyle}>
      {/* Logo */}
      <NavLink to="/" style={logoStyle}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #00e5ff, #0066ff)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
          fontWeight: '800',
          color: '#0a0e1a',
        }}>
          TL
        </div>
        <span style={{ color: '#f9fafb', fontWeight: '700', fontSize: '18px', letterSpacing: '-0.02em' }}>
          Trust<span style={{ color: '#00e5ff' }}>Lens</span>
        </span>
      </NavLink>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        <NavLink to="/" end style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/claims" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Claims
        </NavLink>
        <NavLink to="/analyze" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Analyze
        </NavLink>
      </div>

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f9fafb' }}>{user?.name}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {user?.role}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid #374151',
            color: '#9ca3af',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.target.style.borderColor = '#374151'; e.target.style.color = '#9ca3af'; }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
