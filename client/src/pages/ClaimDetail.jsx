import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ScoreGauge from '../components/ui/ScoreGauge';
import LayerBar from '../components/ui/LayerBar';
import VerdictBadge from '../components/ui/VerdictBadge';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

const LAYER_META = [
  { key: 'photoForensics', label: 'Photo Forensics', weight: 25, desc: 'Detects image manipulation, AI generation, and pixel-level anomalies.' },
  { key: 'behavioralBiometrics', label: 'Behavioral Biometrics', weight: 20, desc: 'Analyzes complaint timing, typing speed, and navigation patterns.' },
  { key: 'userTrustScore', label: 'User Trust Score', weight: 25, desc: 'Reviews claim history, prior denials, and restaurant repeat patterns.' },
  { key: 'deliveryVerification', label: 'Delivery Verification', weight: 15, desc: 'Validates QR tamper seal, delivery-to-complaint gap, and fulfillment records.' },
  { key: 'networkFraudGraph', label: 'Network Fraud Graph', weight: 15, desc: 'Checks VPN usage, shared IP clusters, and coordinated fraud rings.' },
];

function timeAgo(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatDateFull(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function SignalIndicator({ status }) {
  if (status === 'ok') return <span className="signal-ok">✓ OK</span>;
  if (status === 'caution') return <span className="signal-warn">⚠ Caution</span>;
  return <span className="signal-danger">✕ High Risk</span>;
}

function getSignalStatus(key, value) {
  switch (key) {
    case 'timeToComplaintSeconds':
      return value > 300 ? 'ok' : value >= 60 ? 'caution' : 'danger';
    case 'typingSpeedWPM':
      return value < 60 ? 'ok' : value <= 100 ? 'caution' : 'danger';
    case 'claimCount30Days':
      return value <= 1 ? 'ok' : value <= 3 ? 'caution' : 'danger';
    case 'priorDenials':
      return value === 0 ? 'ok' : value <= 2 ? 'caution' : 'danger';
    case 'sharedIPCount':
      return value === 0 ? 'ok' : value <= 2 ? 'caution' : 'danger';
    case 'vpnDetected':
      return value ? 'danger' : 'ok';
    case 'deliveryToComplaintMinutes':
      return value > 15 ? 'ok' : value >= 5 ? 'caution' : 'danger';
    case 'hasQRSeal':
      return value ? 'ok' : 'caution';
    case 'restaurantRepeatCount':
      return value === 0 ? 'ok' : value <= 2 ? 'caution' : 'danger';
    case 'photoManipulationScore':
      return value < 30 ? 'ok' : value <= 60 ? 'caution' : 'danger';
    case 'photoIsAIGenerated':
      return value ? 'danger' : 'ok';
    case 'navigationAnomalyScore':
      return value < 30 ? 'ok' : value <= 60 ? 'caution' : 'danger';
    default:
      return 'ok';
  }
}

function formatSignalValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'timeToComplaintSeconds') return formatDuration(value);
  if (key === 'typingSpeedWPM') return `${value} WPM`;
  if (key === 'deliveryToComplaintMinutes') return `${value} min`;
  return String(value);
}

const SIGNAL_LABELS = {
  timeToComplaintSeconds: 'Time to Complaint',
  typingSpeedWPM: 'Typing Speed',
  claimCount30Days: 'Claims (30 Days)',
  priorDenials: 'Prior Denials',
  sharedIPCount: 'Shared IP Count',
  vpnDetected: 'VPN Detected',
  deliveryToComplaintMinutes: 'Delivery → Complaint',
  hasQRSeal: 'QR Seal Present',
  restaurantRepeatCount: 'Restaurant Repeats',
  photoManipulationScore: 'Photo Manipulation Score',
  photoIsAIGenerated: 'AI-Generated Photo',
  navigationAnomalyScore: 'Navigation Anomaly Score',
};

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVerdict, setModalVerdict] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  async function fetchClaim() {
    setLoading(true);
    try {
      const res = await api.get(`/claims/${id}`);
      if (res.data.success) setClaim(res.data.data);
    } catch {
      toast.error('Claim not found');
      navigate('/claims');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClaim(); }, [id]);

  function openOverride(verdict) {
    setModalVerdict(verdict);
    reset({ reason: '' });
    setModalOpen(true);
  }

  async function onOverrideSubmit({ reason }) {
    setSubmitting(true);
    try {
      const res = await api.patch(`/claims/${id}/decision`, { verdict: modalVerdict, reason });
      if (res.data.success) {
        toast.success(`Verdict updated to ${modalVerdict}`);
        setModalOpen(false);
        setClaim(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update verdict');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={24} width={200} />
        <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 24 }}>
          <div className="card"><Skeleton height={300} /></div>
          <div className="card"><Skeleton height={400} /></div>
        </div>
      </div>
    );
  }

  if (!claim) return null;

  const signals = claim.signals || {};
  const layerScores = claim.layerScores || {};
  const layerExplanations = claim.layerExplanations || {};
  const needsReview = claim.verdict === 'REVIEW' && !claim.humanDecision?.decidedAt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/claims')}>
          ← Claims
        </button>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>/</span>
        <span className="font-mono" style={{ fontSize: 13, color: 'var(--cyan)' }}>{claim.claimId}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Claim header */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)' }}>
                {claim.claimId}
              </span>
              <VerdictBadge verdict={claim.verdict} />
              <span className={`badge badge-${claim.platform}`} style={{ textTransform: 'capitalize' }}>
                {claim.platform}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>
              Filed {timeAgo(claim.createdAt)} · {formatDateFull(claim.createdAt)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 20px' }}>
              {[
                { label: 'Restaurant', value: claim.restaurantName },
                { label: 'Order ID', value: claim.orderId, mono: true },
                { label: 'Claim Type', value: claim.claimType?.replace('_', ' '), capitalize: true },
                { label: 'Amount', value: `₹${claim.claimAmount?.toLocaleString()}`, mono: true },
                { label: 'User', value: claim.userName },
                {
                  label: 'Delivery → Complaint',
                  value: `${signals.deliveryToComplaintMinutes} min`,
                  warn: signals.deliveryToComplaintMinutes < 5,
                },
              ].map(({ label, value, mono, capitalize, warn }) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: 13.5,
                    fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
                    textTransform: capitalize ? 'capitalize' : 'none',
                    color: warn ? 'var(--amber)' : 'var(--text-1)',
                    fontWeight: 500,
                  }}>
                    {value}
                    {warn && <span style={{ fontSize: 10, marginLeft: 6 }}>⚠</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Signals */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Fraud Signals
              </span>
            </div>
            <table className="tl-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Value</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(SIGNAL_LABELS).map((key) => {
                  const value = signals[key];
                  const status = getSignalStatus(key, value);
                  return (
                    <tr key={key} style={{ cursor: 'default' }}>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{SIGNAL_LABELS[key]}</td>
                      <td className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                        {formatSignalValue(key, value)}
                      </td>
                      <td><SignalIndicator status={status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Human Review Action */}
          {needsReview && (
            <div className="card" style={{ border: '1px solid var(--amber-border)', background: 'var(--amber-bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Human Review Required
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
                Override this claim's verdict to resolve it.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => openOverride('FRAUD')}>
                  ✕ Mark as FRAUD
                </button>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => openOverride('LEGITIMATE')}>
                  ✓ Mark as LEGITIMATE
                </button>
              </div>
            </div>
          )}

          {/* Human Decision record */}
          {claim.humanDecision?.decidedAt && (
            <div className="card" style={{ border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Human Decision
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <VerdictBadge verdict={claim.humanDecision.verdict} />
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                  by {claim.humanDecision.analystName || 'Analyst'} · {timeAgo(claim.humanDecision.decidedAt)}
                </span>
              </div>
              {claim.humanDecision.reason && (
                <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{claim.humanDecision.reason}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '28px 20px' }}>
            <ScoreGauge score={claim.compositeScore} size={180} />
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              5-Layer Analysis
            </div>
            {LAYER_META.map(({ key, label, weight, desc }, i) => (
              <LayerBar
                key={key}
                name={label}
                weight={weight}
                score={layerScores[key] || 0}
                description={layerExplanations[key] || desc}
                delay={i * 100}
              />
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Composite Score</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className={`font-mono ${claim.compositeScore >= 65 ? 'score-high' : claim.compositeScore >= 35 ? 'score-mid' : 'score-low'}`}
                    style={{ fontSize: 20, fontWeight: 800 }}
                  >
                    {claim.compositeScore}
                  </span>
                  <VerdictBadge verdict={claim.verdict} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Override modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Override Verdict → ${modalVerdict}`}
      >
        <form onSubmit={handleSubmit(onOverrideSubmit)}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.5 }}>
            You are overriding the AI verdict for claim{' '}
            <span className="font-mono" style={{ color: 'var(--cyan)' }}>{claim.claimId}</span>.
            Please provide a reason.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 6 }}>
              Reason *
            </label>
            <textarea
              className="tl-input"
              rows={4}
              placeholder="Explain your decision..."
              style={{ resize: 'vertical' }}
              {...register('reason', {
                required: 'A reason is required',
                minLength: { value: 10, message: 'Please provide at least 10 characters' },
              })}
            />
            {errors.reason && (
              <span style={{ display: 'block', fontSize: 12, color: 'var(--red)', marginTop: 5 }}>
                {errors.reason.message}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`btn ${modalVerdict === 'FRAUD' ? 'btn-danger' : 'btn-success'}`}
            >
              {submitting ? 'Saving...' : `Confirm ${modalVerdict}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
