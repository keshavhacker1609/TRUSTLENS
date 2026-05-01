import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const FLOAT_STATS = [
  { label: '₹2,400Cr+', sub: 'Fraud Prevented', delay: 0 },
  { label: '97%', sub: 'Accuracy', delay: 0.8 },
  { label: '400ms', sub: 'Decision Time', delay: 1.6 },
  { label: '5 AI', sub: 'Layers', delay: 2.4 },
];

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  async function onSubmit(data) {
    setApiError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.success) {
        login(res.data.data.user, res.data.data.token);
        toast.success(`Welcome back, ${res.data.data.user.name}!`);
        navigate('/');
      }
    } catch (err) {
      setApiError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(type) {
    if (type === 'admin') {
      setValue('email', 'admin@trustlens.io');
      setValue('password', 'admin123');
    } else {
      setValue('email', 'analyst@trustlens.io');
      setValue('password', 'analyst123');
    }
    setApiError('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--base)' }}>
      {/* LEFT: Login form */}
      <div style={{
        flex: '0 0 480px',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 48px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'var(--cyan)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            fontSize: 18,
            color: '#07090f',
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(0,212,255,0.3)',
          }}>
            TL
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6 }}>
            Sign in to TrustLens Command Center
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Email
            </label>
            <input
              className="tl-input"
              type="email"
              placeholder="admin@trustlens.io"
              autoComplete="email"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <span style={{ display: 'block', fontSize: 12, color: 'var(--red)', marginTop: 5 }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              className="tl-input"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
            />
            {errors.password && (
              <span style={{ display: 'block', fontSize: 12, color: 'var(--red)', marginTop: 5 }}>
                {errors.password.message}
              </span>
            )}
          </div>

          {apiError && (
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--red)',
              marginBottom: 16,
            }}>
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', height: 42, fontSize: 14 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{
          marginTop: 28,
          width: '100%',
          maxWidth: 360,
          background: 'var(--cyan-glow)',
          border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Quick Access — Click to autofill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { type: 'admin', email: 'admin@trustlens.io', pwd: 'admin123', role: 'ADMIN', color: 'var(--cyan)' },
              { type: 'analyst', email: 'analyst@trustlens.io', pwd: 'analyst123', role: 'ANALYST', color: 'var(--text-3)' },
            ].map(({ type, email, pwd, role, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => fillDemo(type)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cyan)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              >
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {email} / {pwd}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color,
                  background: 'var(--surface-3)',
                  padding: '2px 6px',
                  borderRadius: 999,
                  flexShrink: 0,
                }}>
                  {role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Visual panel */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '40%',
          width: 400,
          height: 400,
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Big faint background text */}
        <div style={{
          position: 'absolute',
          fontSize: 'clamp(60px, 10vw, 120px)',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.02)',
          letterSpacing: '0.15em',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          TRUSTLENS
        </div>

        {/* Central shield SVG */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
            <path
              d="M60 4L8 28v44c0 30.9 22.1 59.8 52 68 29.9-8.2 52-37.1 52-68V28L60 4z"
              stroke="var(--cyan)"
              strokeWidth="2"
              fill="rgba(0,212,255,0.05)"
            />
            <path
              d="M40 70l14 14 26-28"
              stroke="var(--cyan)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Floating stat badges */}
        {FLOAT_STATS.map(({ label, sub, delay }, i) => {
          const positions = [
            { top: '20%', left: '15%' },
            { top: '15%', right: '15%' },
            { bottom: '25%', left: '10%' },
            { bottom: '20%', right: '12%' },
          ];
          const pos = positions[i];
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.5 }}
              style={{
                position: 'absolute',
                ...pos,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                padding: '12px 18px',
                textAlign: 'center',
                animation: `floatY ${3 + i * 0.5}s ease-in-out ${delay}s infinite`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                {label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
