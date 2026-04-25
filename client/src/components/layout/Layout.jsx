import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import useSocket from '../../hooks/useSocket';

export default function Layout({ children }) {
  useSocket();

  return (
    <div style={{ display: 'flex', minHeight: '100%' }}>
      <Sidebar />
      <div style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <TopBar />
        <main style={{
          marginTop: 'var(--topbar-h)',
          padding: '28px',
          flex: 1,
          minWidth: 0,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
