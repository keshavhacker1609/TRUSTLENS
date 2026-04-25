import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub, color = '#00e5ff', icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: color,
        borderRadius: '12px 12px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            {label}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: color, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>{sub}</div>
          )}
        </div>
        {icon && (
          <div style={{
            fontSize: '28px',
            opacity: 0.3,
          }}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
