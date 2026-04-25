import React, { useEffect, useRef, useState } from 'react';

function getColor(score) {
  if (score >= 65) return 'var(--red)';
  if (score >= 35) return 'var(--amber)';
  return 'var(--green)';
}

function getScoreClass(score) {
  if (score >= 65) return 'score-high';
  if (score >= 35) return 'score-mid';
  return 'score-low';
}

export default function LayerBar({ name, weight, score, description, delay = 0, color: overrideColor }) {
  const [width, setWidth] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score);
      mounted.current = true;
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const color = overrideColor || getColor(score);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{name}</span>
          {weight !== undefined && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
              {weight}% weight
            </span>
          )}
        </div>
        <span
          className={`font-mono ${getScoreClass(score)}`}
          style={{ fontSize: 13.5, fontWeight: 700 }}
        >
          {score}<span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>/100</span>
        </span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${width}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>

      {description && (
        <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
          {description}
        </p>
      )}
    </div>
  );
}
