import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { Skeleton } from '../components/ui/Skeleton';

const CLAIM_TYPE_LABELS = {
  contamination: 'Contamination',
  missing_item:  'Missing Item',
  wrong_order:   'Wrong Order',
  quality:       'Quality Issue',
};

function formatAmount(n) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 12.5 }}>
      <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{p.name || p.dataKey}: {p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Risk Heatmap cell ──────────────────────────────────────────────────────
function HeatCell({ fraudRate, total, avgScore }) {
  const level = fraudRate >= 70 ? 5 : fraudRate >= 50 ? 4 : fraudRate >= 35 ? 3 : fraudRate >= 20 ? 2 : fraudRate >= 10 ? 1 : 0;
  const color = fraudRate >= 60 ? 'var(--red)' : fraudRate >= 35 ? 'var(--amber)' : 'var(--green)';
  return (
    <div className={`heat-cell heat-${level}`} title={`${fraudRate}% fraud rate · avg score ${avgScore}`}>
      <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
        {fraudRate > 0 ? `${fraudRate}%` : '—'}
      </span>
      <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 600 }}>
        {total > 0 ? `n=${total}` : 'no data'}
      </span>
    </div>
  );
}

export default function Analytics() {
  const [dist,   setDist]   = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [users,  setUsers]  = useState([]);
  const [dash,   setDash]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [distRes, matRes, usersRes, dashRes] = await Promise.all([
          api.get('/analytics/score-distribution'),
          api.get('/analytics/risk-matrix'),
          api.get('/analytics/top-risky-users'),
          api.get('/analytics/dashboard'),
        ]);
        if (distRes.data.success)   setDist(distRes.data.data);
        if (matRes.data.success)    setMatrix(matRes.data.data);
        if (usersRes.data.success)  setUsers(usersRes.data.data);
        if (dashRes.data.success)   setDash(dashRes.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Build score distribution bars coloured by bucket range
  const distBars = (dist || []).map((b) => ({
    ...b,
    fill: b.min >= 65 ? 'var(--red)' : b.min >= 35 ? 'var(--amber)' : 'var(--green)',
  }));

  // Radar: platform avg scores
  const radarData = (dash?.platforms || []).map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    score: p.avgScore || 0,
  }));

  // Claim type risk bars
  const ctBars = (dash?.claimTypeBreakdown || []).map((ct) => ({
    name: CLAIM_TYPE_LABELS[ct.type] || ct.type,
    fraudRate: ct.fraudRate,
    count: ct.count,
    avgScore: ct.avgScore,
    totalAmount: ct.totalAmount,
  }));

  // Heatmap: platforms × claim types
  const platforms  = matrix?.platforms  || [];
  const claimTypes = matrix?.claimTypes || [];
  const matMap = {};
  (matrix?.matrix || []).forEach((cell) => {
    matMap[`${cell.platform}__${cell.claimType}`] = cell;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          Deep-dive into fraud patterns, score distributions, and risk matrices
        </p>
      </div>

      {/* Row 1: Score histogram + Claim type fraud rates */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Score distribution */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Score Distribution</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Composite fraud score in 10-point buckets — coloured by risk zone
            </div>
          </div>
          {loading ? <Skeleton height={220} /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distBars} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="range" stroke="var(--text-4)" tick={{ fontSize: 10.5, fill: 'var(--text-3)' }} />
                  <YAxis stroke="var(--text-4)" tick={{ fontSize: 11, fill: 'var(--text-3)' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Score {label}</p>
                          <p style={{ fontSize: 12.5, fontWeight: 700, color: d?.fill }}>Total: {d?.total}</p>
                          <p style={{ fontSize: 11, color: 'var(--red)'   }}>Fraud: {d?.FRAUD}</p>
                          <p style={{ fontSize: 11, color: 'var(--amber)' }}>Review: {d?.REVIEW}</p>
                          <p style={{ fontSize: 11, color: 'var(--green)' }}>Legit: {d?.LEGITIMATE}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={38}>
                    {distBars.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 10, justifyContent: 'center' }}>
                {[['var(--green)', '0–34 Legitimate'], ['var(--amber)', '35–64 Review'], ['var(--red)', '65–100 Fraud']].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Claim type analysis */}
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Fraud Rate by Claim Type</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Which complaint types are most abused</div>
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={52} style={{ marginBottom: 10 }} />)
          ) : ctBars.map((ct) => {
            const barColor = ct.fraudRate >= 50 ? 'var(--red)' : ct.fraudRate >= 30 ? 'var(--amber)' : 'var(--green)';
            return (
              <div key={ct.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{ct.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{ct.count} claims · avg {ct.avgScore}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor, fontFamily: 'JetBrains Mono, monospace', minWidth: 36, textAlign: 'right' }}>
                      {ct.fraudRate}%
                    </span>
                  </div>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    style={{ background: barColor, width: 0 }}
                    animate={{ width: `${ct.fraudRate}%` }}
                    transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>
                  {formatAmount(ct.totalAmount)} total exposure
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: Risk Heatmap + Platform radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Heatmap */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Risk Matrix — Platform × Claim Type</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Fraud rate % per intersection · darker = higher risk
            </div>
          </div>
          {loading ? <Skeleton height={200} /> : platforms.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textAlign: 'left', padding: '4px 6px', width: 80 }}>Platform</th>
                    {claimTypes.map((ct) => (
                      <th key={ct} style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center', padding: '4px 2px', whiteSpace: 'nowrap' }}>
                        {CLAIM_TYPE_LABELS[ct] || ct}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((platform) => (
                    <tr key={platform}>
                      <td style={{ padding: '4px 6px' }}>
                        <span className={`badge badge-${platform}`} style={{ fontSize: 9, textTransform: 'capitalize' }}>{platform}</span>
                      </td>
                      {claimTypes.map((ct) => {
                        const cell = matMap[`${platform}__${ct}`];
                        return (
                          <td key={ct} style={{ padding: 4 }}>
                            <HeatCell
                              fraudRate={cell?.fraudRate || 0}
                              total={cell?.total || 0}
                              avgScore={cell?.avgScore || 0}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Colour scale */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 10.5, color: 'var(--text-3)' }}>
                <span>Low risk</span>
                {[['var(--green)', 0.15], ['var(--amber)', 0.2], ['var(--red)', 0.25]].map(([c, o], i) => (
                  <div key={i} style={{ width: 28, height: 12, background: c, opacity: o + i * 0.15, borderRadius: 3 }} />
                ))}
                <span>High risk</span>
              </div>
            </div>
          )}
        </div>

        {/* Platform score radar */}
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Avg Score by Platform</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Mean composite fraud score</div>
          </div>
          {loading ? <Skeleton height={200} /> : radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="platform" tick={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                <Radar
                  name="Avg Score"
                  dataKey="score"
                  stroke="var(--cyan)"
                  fill="var(--cyan)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={{ fill: 'var(--cyan)', r: 4 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>Avg Score: {payload[0]?.value}</p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>No data</div>
          )}
          {/* Score thresholds legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
            {[['var(--green)', '< 35 Legit'], ['var(--amber)', '35–64 Review'], ['var(--red)', '≥ 65 Fraud']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-3)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top risky users */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Top High-Risk Users</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Ranked by average composite fraud score
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={42} style={{ marginBottom: 8 }} />)}
          </div>
        ) : (
          <table className="tl-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Total Claims</th>
                <th>Fraud Claims</th>
                <th>Fraud Rate</th>
                <th>Avg Score</th>
                <th>Total Exposure</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const scoreColor = u.avgScore >= 65 ? 'var(--red)' : u.avgScore >= 35 ? 'var(--amber)' : 'var(--green)';
                const rateColor  = u.fraudRate >= 60 ? 'var(--red)' : u.fraudRate >= 30 ? 'var(--amber)' : 'var(--green)';
                return (
                  <tr key={u.userName} style={{ cursor: 'default' }}>
                    <td style={{ color: 'var(--text-3)', fontSize: 12, width: 32 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="user-avatar">{u.userName[0].toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.userName}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{u.totalClaims}</td>
                    <td style={{ color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{u.fraudClaims}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-track" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${u.fraudRate}%`, background: rateColor }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: rateColor, fontFamily: 'JetBrains Mono, monospace' }}>{u.fraudRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: scoreColor, fontFamily: 'JetBrains Mono, monospace' }}>{u.avgScore}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatAmount(u.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
