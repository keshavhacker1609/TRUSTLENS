import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/axios';
import ScoreGauge from '../components/ui/ScoreGauge';
import LayerBar from '../components/ui/LayerBar';

const PRESETS = {
  high: {
    platform: 'zomato', claimType: 'contamination', claimAmount: 449,
    timeToComplaintSeconds: 18, typingSpeedWPM: 260, navigationAnomalyScore: 88,
    claimCount30Days: 8, priorDenials: 4, restaurantRepeatCount: 6,
    deliveryToComplaintMinutes: 1, hasQRSeal: false,
    sharedIPCount: 7, vpnDetected: true,
    photoManipulationScore: 91, photoIsAIGenerated: true,
  },
  medium: {
    platform: 'swiggy', claimType: 'wrong_order', claimAmount: 320,
    timeToComplaintSeconds: 140, typingSpeedWPM: 95, navigationAnomalyScore: 44,
    claimCount30Days: 3, priorDenials: 1, restaurantRepeatCount: 2,
    deliveryToComplaintMinutes: 6, hasQRSeal: false,
    sharedIPCount: 2, vpnDetected: true,
    photoManipulationScore: 48, photoIsAIGenerated: false,
  },
  legit: {
    platform: 'swiggy', claimType: 'missing_item', claimAmount: 180,
    timeToComplaintSeconds: 920, typingSpeedWPM: 32, navigationAnomalyScore: 9,
    claimCount30Days: 0, priorDenials: 0, restaurantRepeatCount: 0,
    deliveryToComplaintMinutes: 45, hasQRSeal: true,
    sharedIPCount: 0, vpnDetected: false,
    photoManipulationScore: 8, photoIsAIGenerated: false,
  },
};

const LAYER_META = [
  { key: 'photoForensics',       label: 'Photo Forensics',      weight: 25, color: 'var(--purple)' },
  { key: 'behavioralBiometrics', label: 'Behavioral Biometrics',weight: 20, color: 'var(--blue)' },
  { key: 'userTrustScore',       label: 'User Trust Score',     weight: 25, color: 'var(--cyan)' },
  { key: 'deliveryVerification', label: 'Delivery Verification',weight: 15, color: 'var(--amber)' },
  { key: 'networkFraudGraph',    label: 'Network Fraud Graph',  weight: 15, color: 'var(--red)' },
];

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.12em',
      textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
      paddingBottom: 8, marginBottom: 14, marginTop: 20,
    }}>
      {children}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {error && <span style={{ display: 'block', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</span>}
    </div>
  );
}

function SliderField({ label, min = 0, max = 100, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = pct >= 65 ? 'var(--red)' : pct >= 35 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={onChange}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
    </div>
  );
}

function MLInsightCard({ ml }) {
  if (!ml?.mlAvailable) {
    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 12, color: 'var(--text-3)' }}>
        ML service unavailable — using rule-based scoring only
      </div>
    );
  }
  const probPct    = Math.round(ml.mlFraudProbability * 100);
  const confPct    = Math.round(ml.modelConfidence * 100);
  const probColor  = probPct >= 60 ? 'var(--red)' : probPct >= 35 ? 'var(--amber)' : 'var(--green)';
  const confColor  = confPct >= 70 ? 'var(--green)' : confPct >= 40 ? 'var(--amber)' : 'var(--text-3)';

  const topFeatures = Object.entries(ml.riskContributions || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Probability + confidence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
          <div className="section-label" style={{ marginBottom: 6 }}>ML Fraud Probability</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: probColor, fontFamily: "'JetBrains Mono', monospace" }}>{probPct}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>GradientBoosting</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Model Confidence</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: confColor, fontFamily: "'JetBrains Mono', monospace" }}>{confPct}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>Distance from boundary</div>
        </div>
      </div>

      {/* Anomaly score */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="section-label">IsolationForest Anomaly Score</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            color: ml.anomalyScore >= 60 ? 'var(--red)' : ml.anomalyScore >= 35 ? 'var(--amber)' : 'var(--green)' }}>
            {ml.anomalyScore}/100
          </span>
        </div>
        <div className="progress-track">
          <motion.div className="progress-fill"
            style={{ background: ml.anomalyScore >= 60 ? 'var(--red)' : ml.anomalyScore >= 35 ? 'var(--amber)' : 'var(--green)', width: 0 }}
            animate={{ width: `${ml.anomalyScore}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 5 }}>Higher = more anomalous vs. training distribution</div>
      </div>

      {/* Top risk contributors */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Top Risk Contributors</div>
        {topFeatures.map(([feature, val], i) => {
          const pct = Math.round(val * 1000) / 10;
          const label = feature.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
          return (
            <div key={feature} style={{ marginBottom: i < topFeatures.length - 1 ? 8 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace' " }}>{pct.toFixed(1)}%</span>
              </div>
              <div className="progress-track" style={{ height: 3 }}>
                <motion.div className="progress-fill" style={{ background: 'var(--cyan)', width: 0 }}
                  animate={{ width: `${Math.min(pct * 5, 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analyze() {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      platform: 'zomato', claimType: 'contamination', claimAmount: 300,
      timeToComplaintSeconds: 300, typingSpeedWPM: 40, navigationAnomalyScore: 20,
      claimCount30Days: 0, priorDenials: 0, restaurantRepeatCount: 0,
      deliveryToComplaintMinutes: 30, hasQRSeal: true,
      sharedIPCount: 0, vpnDetected: false,
      photoManipulationScore: 15, photoIsAIGenerated: false,
    },
  });

  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState('layers'); // 'layers' | 'ml'
  const [saveForm,  setSaveForm]  = useState({ userName: '', restaurantName: '', orderId: '' });

  const navScore   = watch('navigationAnomalyScore');
  const photoScore = watch('photoManipulationScore');

  function loadPreset(key) {
    Object.entries(PRESETS[key]).forEach(([k, v]) => setValue(k, v));
    setResult(null);
  }

  async function onSubmit(data) {
    setLoading(true);
    setResult(null);
    try {
      const signals = {
        photoManipulationScore:   Number(data.photoManipulationScore),
        photoIsAIGenerated:       Boolean(data.photoIsAIGenerated),
        timeToComplaintSeconds:   Number(data.timeToComplaintSeconds),
        typingSpeedWPM:           Number(data.typingSpeedWPM),
        navigationAnomalyScore:   Number(data.navigationAnomalyScore),
        claimCount30Days:         Number(data.claimCount30Days),
        priorDenials:             Number(data.priorDenials),
        restaurantRepeatCount:    Number(data.restaurantRepeatCount),
        deliveryToComplaintMinutes: Number(data.deliveryToComplaintMinutes),
        hasQRSeal:                Boolean(data.hasQRSeal),
        sharedIPCount:            Number(data.sharedIPCount),
        vpnDetected:              Boolean(data.vpnDetected),
      };
      const res = await api.post('/fraud/analyze', signals);
      if (res.data.success) {
        setResult({ ...res.data.data, meta: { platform: data.platform, claimType: data.claimType, claimAmount: data.claimAmount } });
        setTab('layers');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!saveForm.userName.trim() || !saveForm.restaurantName.trim() || !saveForm.orderId.trim()) {
      toast.error('Fill in all fields before saving');
      return;
    }
    if (!result) return;
    setSaving(true);
    try {
      const formData = watch();
      const signals = {
        photoManipulationScore: Number(formData.photoManipulationScore),
        photoIsAIGenerated: Boolean(formData.photoIsAIGenerated),
        timeToComplaintSeconds: Number(formData.timeToComplaintSeconds),
        typingSpeedWPM: Number(formData.typingSpeedWPM),
        navigationAnomalyScore: Number(formData.navigationAnomalyScore),
        claimCount30Days: Number(formData.claimCount30Days),
        priorDenials: Number(formData.priorDenials),
        restaurantRepeatCount: Number(formData.restaurantRepeatCount),
        deliveryToComplaintMinutes: Number(formData.deliveryToComplaintMinutes),
        hasQRSeal: Boolean(formData.hasQRSeal),
        sharedIPCount: Number(formData.sharedIPCount),
        vpnDetected: Boolean(formData.vpnDetected),
      };
      const res = await api.post('/claims', {
        userName: saveForm.userName,
        restaurantName: saveForm.restaurantName,
        orderId: saveForm.orderId,
        platform: formData.platform,
        claimType: formData.claimType,
        claimAmount: Number(formData.claimAmount),
        signals,
      });
      if (res.data.success) {
        toast.success(`Claim ${res.data.data.claimId} saved!`);
        setSaveForm({ userName: '', restaurantName: '', orderId: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Radar data from layer scores
  const radarData = result ? LAYER_META.map(({ key, label }) => ({
    layer: label.replace(' Biometrics', '').replace(' Forensics', '').replace(' Verification', '').replace(' Graph', ''),
    score: result.layerScores?.[key] || 0,
  })) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
            Run Analysis
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
            5-layer AI engine + ML model · GradientBoosting + IsolationForest
          </p>
        </div>
        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => loadPreset('high')}>
            High Risk
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadPreset('medium')}>
            Borderline
          </button>
          <button type="button" className="btn btn-success btn-sm" onClick={() => loadPreset('legit')}>
            Legitimate
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'start' }}>
        {/* LEFT: Form */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)}>
            <SectionLabel>General</SectionLabel>
            <Field label="Platform">
              <select className="tl-select" {...register('platform')}>
                <option value="zomato">Zomato</option>
                <option value="swiggy">Swiggy</option>
                <option value="blinkit">Blinkit</option>
                <option value="zepto">Zepto</option>
              </select>
            </Field>
            <Field label="Claim Type">
              <select className="tl-select" {...register('claimType')}>
                <option value="contamination">Contamination</option>
                <option value="missing_item">Missing Item</option>
                <option value="wrong_order">Wrong Order</option>
                <option value="quality">Quality Issue</option>
              </select>
            </Field>
            <Field label="Claim Amount (₹)" error={errors.claimAmount?.message}>
              <input className="tl-input" type="number" min={1}
                {...register('claimAmount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })} />
            </Field>

            <SectionLabel>Layer 1 — Photo Forensics</SectionLabel>
            <SliderField label="Photo Manipulation Score" min={0} max={100}
              value={Number(photoScore)} onChange={(e) => setValue('photoManipulationScore', Number(e.target.value))} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="photoIsAIGenerated" {...register('photoIsAIGenerated')}
                style={{ width: 15, height: 15, accentColor: 'var(--cyan)', cursor: 'pointer' }} />
              <label htmlFor="photoIsAIGenerated" style={{ fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' }}>
                AI-Generated Photo Detected
              </label>
            </div>

            <SectionLabel>Layer 2 — Behavioral Biometrics</SectionLabel>
            <Field label="Time to Complaint (seconds)">
              <input className="tl-input" type="number" min={0} {...register('timeToComplaintSeconds')} />
            </Field>
            <Field label="Typing Speed (WPM)">
              <input className="tl-input" type="number" min={0} {...register('typingSpeedWPM')} />
            </Field>
            <SliderField label="Navigation Anomaly Score" min={0} max={100}
              value={Number(navScore)} onChange={(e) => setValue('navigationAnomalyScore', Number(e.target.value))} />

            <SectionLabel>Layer 3 — User Trust Score</SectionLabel>
            <Field label="Claims in Last 30 Days">
              <input className="tl-input" type="number" min={0} {...register('claimCount30Days')} />
            </Field>
            <Field label="Prior Denials">
              <input className="tl-input" type="number" min={0} {...register('priorDenials')} />
            </Field>
            <Field label="Restaurant Repeat Claims">
              <input className="tl-input" type="number" min={0} {...register('restaurantRepeatCount')} />
            </Field>

            <SectionLabel>Layer 4 — Delivery Verification</SectionLabel>
            <Field label="Delivery to Complaint (minutes)">
              <input className="tl-input" type="number" min={0} {...register('deliveryToComplaintMinutes')} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="hasQRSeal" {...register('hasQRSeal')}
                style={{ width: 15, height: 15, accentColor: 'var(--cyan)', cursor: 'pointer' }} />
              <label htmlFor="hasQRSeal" style={{ fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' }}>
                QR Tamper Seal Present
              </label>
            </div>

            <SectionLabel>Layer 5 — Network Fraud Graph</SectionLabel>
            <Field label="Shared IP Count">
              <input className="tl-input" type="number" min={0} {...register('sharedIPCount')} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input type="checkbox" id="vpnDetected" {...register('vpnDetected')}
                style={{ width: 15, height: 15, accentColor: 'var(--cyan)', cursor: 'pointer' }} />
              <label htmlFor="vpnDetected" style={{ fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' }}>
                VPN / Proxy Detected
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', height: 44, fontSize: 13.5, letterSpacing: '0.05em' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(5,8,15,0.3)', borderTopColor: '#05080f', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Running 5-Layer Analysis…
                </span>
              ) : 'RUN ANALYSIS →'}
            </button>
          </form>
        </div>

        {/* RIGHT: Results */}
        <div>
          {!result && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 440, color: 'var(--text-3)', textAlign: 'center', padding: 40,
            }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 20, opacity: 0.25 }}>
                <circle cx="28" cy="28" r="20" stroke="var(--text-2)" strokeWidth="2.5"/>
                <path d="M43 43L56 56" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M28 20v8M28 31v2" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Configure signals and run analysis</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Select a preset or fill in values manually, then click Run Analysis</div>
            </div>
          )}

          {loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 440, textAlign: 'center', padding: 40,
            }}>
              <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 24 }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--border)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--cyan)', borderRadius: '50%', borderRightColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 10, border: '2px solid var(--surface-3)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 10, border: '2px solid var(--cyan)', borderRadius: '50%', borderTopColor: 'transparent', borderLeftColor: 'transparent', animation: 'spin 0.5s linear reverse infinite' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
                Running Analysis
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Photo Forensics', 'Behavioral', 'User Trust', 'Delivery', 'Network', 'ML Model'].map((l, i) => (
                  <span key={l} style={{
                    fontSize: 11, color: 'var(--text-3)',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 999, padding: '3px 10px',
                    animation: `pulse 1.4s ease ${i * 0.18}s infinite`,
                  }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Score gauge + meta */}
              <div className="card" style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '24px 28px' }}>
                <ScoreGauge score={result.compositeScore} size={148} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Rule-based score</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
                    {result.ruleScore || result.compositeScore}
                    {result.mlInsights?.mlAvailable && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginLeft: 8 }}>
                        → ML blended: {result.compositeScore}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="section-label">Platform</span>
                      <span className={`badge badge-${result.meta?.platform}`} style={{ textTransform: 'capitalize' }}>{result.meta?.platform}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="section-label">Claim</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{result.meta?.claimType?.replace('_', ' ')} · ₹{result.meta?.claimAmount}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="section-label">Processing</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{result.processingTimeMs}ms</span>
                    </div>
                    {result.mlInsights?.mlAvailable && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>ML Engine Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="tab-nav">
                {[['layers', '5-Layer Breakdown'], ['radar', 'Radar Chart'], ['ml', 'ML Insights']].map(([key, label]) => (
                  <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === 'layers' && (
                  <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card">
                    <div className="section-label" style={{ marginBottom: 16 }}>Layer Scores & Explanations</div>
                    {LAYER_META.map(({ key, label, weight, color }, i) => (
                      <LayerBar
                        key={key}
                        name={label}
                        weight={weight}
                        score={result.layerScores?.[key] || 0}
                        description={result.layerExplanations?.[key] || ''}
                        delay={i * 90}
                        color={color}
                      />
                    ))}
                  </motion.div>
                )}

                {tab === 'radar' && (
                  <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card">
                    <div className="section-label" style={{ marginBottom: 16 }}>Risk Radar — All 5 Layers</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="layer" tick={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 600 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                        <Radar name="Risk Score" dataKey="score" stroke="var(--red)" fill="var(--red)" fillOpacity={0.15} strokeWidth={2}
                          dot={{ fill: 'var(--red)', r: 4 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px' }}>
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>Score: {payload[0]?.value}/100</p>
                              </div>
                            );
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                      {LAYER_META.map(({ key, label, color }) => (
                        <div key={key} style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                          {label}: <span style={{ color, fontWeight: 700 }}>{result.layerScores?.[key] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {tab === 'ml' && (
                  <motion.div key="ml" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card">
                    <div className="section-label" style={{ marginBottom: 16 }}>ML Model Insights</div>
                    <MLInsightCard ml={result.mlInsights} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save to DB */}
              <div className="card" style={{ border: '1px solid var(--cyan-border)' }}>
                <div className="section-label" style={{ color: 'var(--cyan)', marginBottom: 14 }}>Save to Database</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <input className="tl-input" placeholder="Customer name" value={saveForm.userName}
                    onChange={(e) => setSaveForm((p) => ({ ...p, userName: e.target.value }))} />
                  <input className="tl-input" placeholder="Restaurant name" value={saveForm.restaurantName}
                    onChange={(e) => setSaveForm((p) => ({ ...p, restaurantName: e.target.value }))} />
                  <input className="tl-input" placeholder="Order ID (e.g. ORD-123456)" value={saveForm.orderId}
                    onChange={(e) => setSaveForm((p) => ({ ...p, orderId: e.target.value }))}
                    style={{ gridColumn: '1 / -1' }} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Claim to Database'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
