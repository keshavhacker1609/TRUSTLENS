import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LAYERS = [
  { key: 'photoForensics', name: 'Photo Forensics', weight: 25, icon: '📷' },
  { key: 'behavioralBiometrics', name: 'Behavioral Biometrics', weight: 20, icon: '🧠' },
  { key: 'userTrustScore', name: 'User Trust Score', weight: 25, icon: '👤' },
  { key: 'deliveryVerification', name: 'Delivery Verification', weight: 15, icon: '📍' },
  { key: 'networkFraudGraph', name: 'Network Fraud Graph', weight: 15, icon: '🌐' },
];

function getScoreColor(score) {
  if (score >= 65) return '#ef4444';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

export default function LayerBreakdown({ layerScores = {} }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {LAYERS.map((layer, idx) => {
        const score = layerScores[layer.key] ?? 0;
        const color = getScoreColor(score);

        return (
          <motion.div
            key={layer.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.35 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{layer.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f9fafb' }}>{layer.name}</span>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(0,229,255,0.1)',
                  color: '#00e5ff',
                  border: '1px solid rgba(0,229,255,0.2)',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontWeight: '700',
                }}>
                  {layer.weight}%
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color }}>
                {score}
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>/100</span>
              </div>
            </div>

            <div className="progress-bar-track">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: animated ? `${score}%` : 0 }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                style={{
                  background: `linear-gradient(90deg, ${color}88, ${color})`,
                  boxShadow: `0 0 8px ${color}44`,
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
