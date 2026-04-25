import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Claims from './pages/Claims';
import ClaimDetail from './pages/ClaimDetail';
import Analyze from './pages/Analyze';
import Analytics from './pages/Analytics';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#e2e8f4',
            border: '1px solid #1e2a3a',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13.5px',
          },
          success: { iconTheme: { primary: '#00c896', secondary: '#111827' } },
          error: { iconTheme: { primary: '#ff3347', secondary: '#111827' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims"
          element={
            <ProtectedRoute>
              <Layout><Claims /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims/:id"
          element={
            <ProtectedRoute>
              <Layout><ClaimDetail /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze"
          element={
            <ProtectedRoute>
              <Layout><Analyze /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout><Analytics /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
