import React, { useEffect, useRef, useState } from 'react';

function getScoreColor(score) {
  if (score >= 65) return 'var(--red)';
  if (score >= 35) return 'var(--amber)';
  return 'var(--green)';
}

function getVerdict(score) {
  if (score >= 65) return 'FRAUD';
  if (score >= 35) return 'REVIEW';
  return 'LEGITIMATE';
}

export default function ScoreGauge({ score = 0, size = 120 }) {
  const [displayScore, setDisplayScore] = useState(0);
  const animRef = useRef(null);
  const strokeWidth = size * 0.08;
  const radius = (size / 2) - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 220 degrees
  const arcLength = (220 / 360) * circumference;
  const rotation = -110; // start at bottom-left

  useEffect(() => {
    let start = null;
    const duration = 1000;
    const from = 0;
    const to = score;

    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score]);

  const color = getScoreColor(displayScore);
  const verdict = getVerdict(displayScore);

  // offset: 0 = full arc, arcLength = empty arc
  const filledRatio = displayScore / 100;
  const offset = arcLength - filledRatio * arcLength;

  const cx = size / 2;
  const cy = size / 2;

  const verdictColors = {
    FRAUD: 'var(--red)',
    REVIEW: 'var(--amber)',
    LEGITIMATE: 'var(--green)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
      <svg
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          {/* Background arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease',
              filter: `drop-shadow(0 0 ${strokeWidth / 2}px ${color})`,
            }}
          />
        </g>
        {/* Center score */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          fontSize={size * 0.22}
          style={{ transition: 'fill 0.3s' }}
        >
          {displayScore}
        </text>
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          fill="var(--text-3)"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
          fontSize={size * 0.085}
          letterSpacing="0.05em"
        >
          / 100
        </text>
      </svg>
      <div style={{
        marginTop: 4,
        fontSize: size * 0.09,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: verdictColors[verdict],
        textTransform: 'uppercase',
      }}>
        {verdict}
      </div>
    </div>
  );
}
