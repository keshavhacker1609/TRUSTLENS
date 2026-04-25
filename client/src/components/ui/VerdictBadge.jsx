import React from 'react';

const CONFIG = {
  FRAUD: { label: 'FRAUD', cls: 'badge badge-fraud', pulse: true },
  REVIEW: { label: 'REVIEW', cls: 'badge badge-review', pulse: false },
  LEGITIMATE: { label: 'LEGITIMATE', cls: 'badge badge-legitimate', pulse: false },
};

export default function VerdictBadge({ verdict }) {
  const cfg = CONFIG[verdict] || CONFIG.REVIEW;
  return (
    <span className={cfg.cls}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'currentColor',
        display: 'inline-block',
        flexShrink: 0,
        animation: cfg.pulse ? 'pulseDot 1.4s ease-in-out infinite' : 'none',
      }} />
      {cfg.label}
    </span>
  );
}
