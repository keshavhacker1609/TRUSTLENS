import React, { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useUIStore from '../store/uiStore';
import VerdictBadge from '../components/ui/VerdictBadge';
import { Skeleton } from '../components/ui/Skeleton';

const C = {
  FRAUD: 'var(--red)',
  REVIEW: 'var(--amber)',
  LEGITIMATE: 'var(--green)',
};

function formatCurrency(n) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * e));
      if (p < 1) ref.current = requestAnimationFrame(frame);
    }
    ref.current = requestAnimationFrame(frame);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
}

// ── SVG Icon components ────────────────────────────────────────────────────
function IconClaims({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 6.5h8M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconAlert({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9 7.5v3.5M9 12.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconShield({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 2L3 5v5c0 4 2.8 7 6 8 3.2-1 6-4 6-8V5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 9l2 2 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBolt({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M10.5 2L4 10h6.5L7.5 16 14 8H7.5L10.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconScore({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ icon, label, rawValue, displayValue, sub, trend, trendUp, variant = 'cyan', delay = 0 }) {
  const count = useCountUp(rawValue || 0);
  const shown = displayValue || count.toLocaleString();
  return (
    <motion.div
      className={`card-metric variant-${variant}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div className={`metric-icon ${variant}`}>{icon}</div>
        {trend && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: trendUp ? 'var(--green)' : 'var(--red)',
            background: trendUp ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${trendUp ? 'var(--green-border)' : 'var(--red-border)'}`,
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            {trend}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text-1)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {shown}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ── Chart Tooltip ──────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 7, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <p style={{ color: p.color, fontSize: 12.5, fontWeight: 700 }}>{p.name}: {p.value}</p>
        </div>
      ))}
    </div>
  );
};

// ── Live feed item ─────────────────────────────────────────────────────────
function LiveFeedItem({ claim, isNew }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -12 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => navigate(`/claims/${claim.claimId}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <div className="user-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
        {claim.userName ? claim.userName[0].toUpperCase() : '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
            {claim.userName}
          </span>
          <span className={`badge badge-${claim.platform}`} style={{ fontSize: 9, padding: '1px 5px' }}>
            {claim.platform}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          ₹{claim.claimAmount?.toLocaleString()} · {timeAgo(claim.createdAt)}
        </div>
      </div>
      <VerdictBadge verdict={claim.verdict} />
    </motion.div>
  );
}

// ── Platform risk row ──────────────────────────────────────────────────────
function PlatformRow({ platform, FRAUD, total, avgScore }) {
  const fraudRate = total > 0 ? Math.round((FRAUD / total) * 100) : 0;
  const color = fraudRate >= 45 ? 'var(--red)' : fraudRate >= 25 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span className={`badge badge-${platform}`} style={{ minWidth: 62, justifyContent: 'center', textTransform: 'capitalize' }}>{platform}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{total} claims</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{fraudRate}% fraud</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fraudRate}%`, background: color }} />
        </div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 700, color: avgScore >= 65 ? 'var(--red)' : avgScore >= 35 ? 'var(--amber)' : 'var(--green)', minWidth: 28, textAlign: 'right' }}>
        {avgScore}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [feedItems, setFeedItems] = useState([]);
  const recentClaims = useUIStore((s) => s.recentClaims);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, feedRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/recent'),
        ]);
        if (dashRes.data.success) setData(dashRes.data.data);
        if (feedRes.data.success) setFeedItems(feedRes.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const overview  = data?.overview  || {};
  const trend     = data?.trend     || [];
  const platforms = data?.platforms || [];

  const merged = recentClaims.length > 0
    ? [...recentClaims, ...feedItems].slice(0, 12)
    : feedItems.slice(0, 12);

  const pieData = [
    { name: 'FRAUD',      value: overview.fraudClaims      || 0 },
    { name: 'REVIEW',     value: overview.reviewClaims     || 0 },
    { name: 'LEGITIMATE', value: overview.legitimateClaims || 0 },
  ].filter((d) => d.value > 0);

  const fraudRate = overview.totalClaims
    ? Math.round((overview.fraudClaims / overview.totalClaims) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
            Operations Dashboard
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
            Real-time fraud detection — all platforms · Live
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', margin: '0 6px 1px', animation: 'pulseDot 2s ease infinite', verticalAlign: 'middle' }} />
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 128 }}>
              <Skeleton height={38} width={38} style={{ marginBottom: 14, borderRadius: 9 }} />
              <Skeleton height={11} width={80} style={{ marginBottom: 8 }} />
              <Skeleton height={28} width="55%" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              icon={<IconClaims />}
              label="Total Claims"
              rawValue={overview.totalClaims || 0}
              sub="All platforms, all time"
              variant="cyan"
              delay={0}
            />
            <MetricCard
              icon={<IconAlert />}
              label="Fraud Detected"
              rawValue={overview.fraudClaims || 0}
              sub={`${fraudRate}% of all claims`}
              trend={`${fraudRate}% rate`}
              trendUp={false}
              variant="red"
              delay={0.07}
            />
            <MetricCard
              icon={<IconShield />}
              label="Amount Blocked"
              displayValue={formatCurrency(overview.fraudAmountSaved || 0)}
              rawValue={0}
              sub="Prevented fraud value"
              trend="Saved"
              trendUp={true}
              variant="green"
              delay={0.14}
            />
            <MetricCard
              icon={<IconBolt />}
              label="Auto-Resolved"
              displayValue={`${overview.autoResolutionRate || 0}%`}
              rawValue={0}
              sub={`${overview.humanOverridesCount || 0} human overrides`}
              variant="amber"
              delay={0.21}
            />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Area trend */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Claims Trend</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>7-day breakdown by verdict</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
              {['FRAUD', 'REVIEW', 'LEGITIMATE'].map((v) => (
                <span key={v} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: C[v], display: 'inline-block' }} />
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          {loading ? <Skeleton height={210} /> : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trend} margin={{ top: 2, right: 8, bottom: 0, left: -24 }}>
                <defs>
                  {[['fraud', 'var(--red)'], ['review', 'var(--amber)'], ['legit', 'var(--green)']].map(([id, color]) => (
                    <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-4)" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <YAxis stroke="var(--text-4)" tick={{ fontSize: 11, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="FRAUD"      stroke="var(--red)"   fill="url(#g-fraud)"  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--red)' }} />
                <Area type="monotone" dataKey="REVIEW"     stroke="var(--amber)" fill="url(#g-review)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--amber)' }} />
                <Area type="monotone" dataKey="LEGITIMATE" stroke="var(--green)" fill="url(#g-legit)"  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--green)' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No data for last 7 days
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="card">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Verdict Distribution</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {overview.totalClaims || 0} total claims
            </div>
          </div>
          {loading ? <Skeleton height={180} /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius="48%" outerRadius="76%" paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((e) => <Cell key={e.name} fill={C[e.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {pieData.map((d) => {
                  const pct = overview.totalClaims > 0 ? Math.round((d.value / overview.totalClaims) * 100) : 0;
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C[d.name] }} />
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.name.charAt(0) + d.name.slice(1).toLowerCase()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{pct}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C[d.name], fontFamily: 'JetBrains Mono, monospace', minWidth: 22, textAlign: 'right' }}>{d.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Platform Risk Rates */}
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Platform Risk Rates</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Fraud % and avg score per platform</div>
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} style={{ marginBottom: 8 }} />)
          ) : platforms.length > 0 ? (
            <div>
              {platforms.map((p) => (
                <PlatformRow key={p.platform} {...p} />
              ))}
            </div>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No platform data
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Live Activity Feed</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Real-time claim stream</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.06em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulseDot 2s ease infinite' }} />
              LIVE
            </div>
          </div>
          <div style={{ maxHeight: 290, overflowY: 'auto', paddingRight: 4 }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Skeleton height={12} width="75%" style={{ marginBottom: 6 }} />
                  <Skeleton height={10} width="50%" />
                </div>
              ))
            ) : merged.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '32px 0' }}>
                No recent claims
              </div>
            ) : (
              merged.map((claim, i) => (
                <LiveFeedItem
                  key={claim.claimId || claim._id || i}
                  claim={claim}
                  isNew={recentClaims.includes(claim)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
