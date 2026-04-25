import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import api from '../api/axios';

function verdictColor(verdict) {
  if (verdict === 'FRAUD') return '#ef4444';
  if (verdict === 'REVIEW') return '#f59e0b';
  return '#10b981';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LiveFeed() {
  const [claims, setClaims] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Load initial recent claims
    api.get('/analytics/recent').then((res) => {
      if (res.data.success) {
        setClaims(res.data.data.slice(0, 8));
      }
    }).catch(() => {});

    // Connect Socket.IO
    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('newClaim', (claim) => {
      setClaims((prev) => [claim, ...prev].slice(0, 8));
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#f9fafb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live Feed
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: connected ? '#10b981' : '#6b7280',
            boxShadow: connected ? '0 0 6px #10b981' : 'none',
            animation: connected ? 'pulse-glow 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '11px', color: connected ? '#10b981' : '#6b7280' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Feed items */}
      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <AnimatePresence>
          {claims.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              No recent claims
            </div>
          ) : (
            claims.map((claim, idx) => (
              <motion.div
                key={claim.claimId || claim._id || idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Verdict dot */}
                <div style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: verdictColor(claim.verdict),
                  flexShrink: 0,
                  boxShadow: `0 0 5px ${verdictColor(claim.verdict)}88`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {claim.userName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {claim.platform} · ₹{claim.claimAmount}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: verdictColor(claim.verdict) }}>
                    {claim.compositeScore}%
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    {timeAgo(claim.createdAt)}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
