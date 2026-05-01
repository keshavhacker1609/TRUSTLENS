import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import VerdictBadge from '../components/ui/VerdictBadge';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const CLAIM_TYPE_LABELS = {
  contamination: 'Contamination',
  missing_item:  'Missing Item',
  wrong_order:   'Wrong Order',
  quality:       'Quality Issue',
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function scoreColor(score) {
  if (score >= 65) return 'var(--red)';
  if (score >= 35) return 'var(--amber)';
  return 'var(--green)';
}

function ScoreCell({ score }) {
  const color = scoreColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
        fontSize: 13.5, color, minWidth: 22,
      }}>
        {score}
      </span>
      <div style={{ width: 44, height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

export default function Claims() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [claims, setClaims]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });
  const [loading, setLoading]     = useState(true);
  const debounceRef = useRef(null);

  const platform  = searchParams.get('platform')  || '';
  const verdict   = searchParams.get('verdict')   || '';
  const search    = searchParams.get('search')    || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate   = searchParams.get('endDate')   || '';
  const page      = parseInt(searchParams.get('page') || '1', 10);

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }

  function setPage(p) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (platform)  params.platform  = platform;
      if (verdict)   params.verdict   = verdict;
      if (search)    params.search    = search;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await api.get('/claims', { params });
      if (res.data.success) {
        setClaims(res.data.data.claims);
        setPagination(res.data.data.pagination);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [platform, verdict, search, startDate, endDate, page]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  function handleSearch(value) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam('search', value), 380);
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (platform)  params.set('platform',  platform);
    if (verdict)   params.set('verdict',   verdict);
    if (search)    params.set('search',    search);
    if (startDate) params.set('startDate', startDate);
    if (endDate)   params.set('endDate',   endDate);
    const token = localStorage.getItem('tl_token');
    const base = import.meta.env.VITE_API_EXPORT_BASE || '';
    window.open(`${base}/api/export/claims?${params}&token=${token}`, '_blank');
  }

  const from = (page - 1) * pagination.limit + 1;
  const to   = Math.min(page * pagination.limit, pagination.total);
  const hasFilters = platform || verdict || search || startDate || endDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>Claims</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
            {loading ? 'Loading…' : `${pagination.total.toLocaleString()} claim${pagination.total !== 1 ? 's' : ''}${hasFilters ? ' · filtered' : ''}`}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ gap: 7 }}>
          <DownloadIcon /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterIcon />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filters</span>
          {hasFilters && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setSearchParams({})}
              style={{ marginLeft: 4, color: 'var(--amber)' }}
            >
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 148px 148px 140px 140px', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
              Search
            </label>
            <input
              className="tl-input"
              type="text"
              placeholder="Claim ID, user, restaurant…"
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {[
            { label: 'Platform', key: 'platform', val: platform, options: [['', 'All Platforms'], ['zomato', 'Zomato'], ['swiggy', 'Swiggy'], ['blinkit', 'Blinkit'], ['zepto', 'Zepto']] },
            { label: 'Verdict',  key: 'verdict',  val: verdict,  options: [['', 'All Verdicts'], ['FRAUD', 'Fraud'], ['REVIEW', 'Review'], ['LEGITIMATE', 'Legitimate']] },
          ].map(({ label, key, val, options }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                {label}
              </label>
              <select className="tl-select" value={val} onChange={(e) => setParam(key, e.target.value)}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
              From
            </label>
            <input type="date" className="tl-input" value={startDate} onChange={(e) => setParam('startDate', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
              To
            </label>
            <input type="date" className="tl-input" value={endDate} onChange={(e) => setParam('endDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <SkeletonTable rows={10} cols={8} /> : claims.length === 0 ? (
          <EmptyState title="No claims found" subtitle="Try adjusting your filters or search query." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tl-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Claim ID</th>
                  <th>Platform</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Score</th>
                  <th>Verdict</th>
                  <th>Filed</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim._id} onClick={() => navigate(`/claims/${claim.claimId}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="user-avatar">{claim.userName ? claim.userName[0].toUpperCase() : '?'}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                          {claim.userName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>
                        {claim.claimId}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${claim.platform}`} style={{ textTransform: 'capitalize' }}>
                        {claim.platform}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      {CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13 }}>
                      ₹{claim.claimAmount?.toLocaleString()}
                    </td>
                    <td><ScoreCell score={claim.compositeScore} /></td>
                    <td><VerdictBadge verdict={claim.verdict} /></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {timeAgo(claim.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            Showing {from}–{to} of {pagination.total.toLocaleString()} claims
          </span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              let p;
              if (pagination.pages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= pagination.pages - 3) p = pagination.pages - 6 + i;
              else p = page - 3 + i;
              return (
                <button key={p} className="btn btn-ghost btn-sm" onClick={() => setPage(p)} style={{
                  minWidth: 32,
                  background: p === page ? 'var(--cyan-glow)' : 'transparent',
                  color: p === page ? 'var(--cyan)' : 'var(--text-2)',
                  border: `1px solid ${p === page ? 'var(--cyan-border)' : 'var(--border-strong)'}`,
                }}>
                  {p}
                </button>
              );
            })}
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page >= pagination.pages} style={{ opacity: page >= pagination.pages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
