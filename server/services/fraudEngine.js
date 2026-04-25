'use strict';

const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ML_TIMEOUT_MS = 1500;

const THRESHOLDS = {
  photo: {
    manipulationHighRisk: 70,
    manipulationCaution: 35,
    aiGeneratedPenalty: 30,
    navigationWeight: 0.1,
  },
  behavioral: {
    speedHighRisk: 60,
    speedCaution: 180,
    speedLate: 86400,
    wpmHighRisk: 150,
    wpmCaution: 80,
    wpmSlow: 8,
  },
  userTrust: {
    claimsHighRisk: 5,
    claimsCaution: 2,
    priorDenialPenaltyPer: 15,
    priorDenialMax: 45,
    repeatHighRisk: 3,
  },
  delivery: {
    noSealPenalty: 18,
    complaintImmediateHighRisk: 2,
    complaintFastCaution: 8,
    complaintLate: 1440,
    repeatHighRisk: 3,
  },
  network: {
    sharedIPHighRisk: 5,
    sharedIPCaution: 2,
    vpnPenalty: 28,
    burstHighRisk: 5,
  },
};

const WEIGHTS = {
  photoForensics: 0.25,
  behavioralBiometrics: 0.20,
  userTrustScore: 0.25,
  deliveryVerification: 0.15,
  networkFraudGraph: 0.15,
};

const VERDICT_THRESHOLDS = { fraud: 65, review: 35 };

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

// ── Rule-based layer scorers ──────────────────────────────────────────────

function scorePhotoForensics(signals) {
  const { photoManipulationScore = 0, photoIsAIGenerated = false, navigationAnomalyScore = 0 } = signals;
  let score = 0;
  if (photoManipulationScore >= THRESHOLDS.photo.manipulationHighRisk) {
    score += 55;
  } else if (photoManipulationScore >= THRESHOLDS.photo.manipulationCaution) {
    score += (photoManipulationScore - THRESHOLDS.photo.manipulationCaution) /
      (THRESHOLDS.photo.manipulationHighRisk - THRESHOLDS.photo.manipulationCaution) * 30 + 10;
  } else {
    score += (photoManipulationScore / THRESHOLDS.photo.manipulationCaution) * 10;
  }
  if (photoIsAIGenerated) score += THRESHOLDS.photo.aiGeneratedPenalty;
  score += navigationAnomalyScore * THRESHOLDS.photo.navigationWeight;
  score = clamp(score);

  let explanation;
  if (photoIsAIGenerated) {
    explanation = `AI-generated image detected (manipulation score ${photoManipulationScore}/100). High risk of fabricated evidence.`;
  } else if (photoManipulationScore >= THRESHOLDS.photo.manipulationHighRisk) {
    explanation = `Photo manipulation score ${photoManipulationScore}/100 — heavy editing artifacts detected.`;
  } else if (photoManipulationScore >= THRESHOLDS.photo.manipulationCaution) {
    explanation = `Moderate photo manipulation detected (score ${photoManipulationScore}/100). Warrants further review.`;
  } else {
    explanation = `Photo appears authentic. Manipulation score ${photoManipulationScore}/100 is within normal range.`;
  }
  return { score, explanation };
}

function scoreBehavioralBiometrics(signals) {
  const { timeToComplaintSeconds = 300, typingSpeedWPM = 40, navigationAnomalyScore = 0 } = signals;
  let score = 0;
  if (timeToComplaintSeconds < THRESHOLDS.behavioral.speedHighRisk) {
    score += 45;
  } else if (timeToComplaintSeconds < THRESHOLDS.behavioral.speedCaution) {
    const ratio = 1 - (timeToComplaintSeconds - THRESHOLDS.behavioral.speedHighRisk) /
      (THRESHOLDS.behavioral.speedCaution - THRESHOLDS.behavioral.speedHighRisk);
    score += ratio * 30;
  } else if (timeToComplaintSeconds > THRESHOLDS.behavioral.speedLate) {
    score += 10;
  }
  if (typingSpeedWPM > THRESHOLDS.behavioral.wpmHighRisk) score += 35;
  else if (typingSpeedWPM > THRESHOLDS.behavioral.wpmCaution) score += 15;
  else if (typingSpeedWPM < THRESHOLDS.behavioral.wpmSlow && typingSpeedWPM > 0) score += 5;
  score += (navigationAnomalyScore / 100) * 20;
  score = clamp(score);

  let explanation;
  if (timeToComplaintSeconds < THRESHOLDS.behavioral.speedHighRisk) {
    explanation = `Complaint filed ${timeToComplaintSeconds}s after delivery — below human reaction threshold. Automated submission suspected.`;
  } else if (typingSpeedWPM > THRESHOLDS.behavioral.wpmHighRisk) {
    explanation = `Typing speed ${typingSpeedWPM} WPM exceeds human capability — bot-assisted form submission likely.`;
  } else if (timeToComplaintSeconds < THRESHOLDS.behavioral.speedCaution) {
    explanation = `Complaint filed quickly (${timeToComplaintSeconds}s). Typing speed ${typingSpeedWPM} WPM — borderline suspicious.`;
  } else {
    explanation = `Behavioral signals within expected range: ${timeToComplaintSeconds}s complaint time, ${typingSpeedWPM} WPM typing.`;
  }
  return { score, explanation };
}

function scoreUserTrust(signals) {
  const { claimCount30Days = 0, priorDenials = 0, restaurantRepeatCount = 0 } = signals;
  let score = 0;
  if (claimCount30Days >= THRESHOLDS.userTrust.claimsHighRisk) {
    score += 40;
  } else if (claimCount30Days >= THRESHOLDS.userTrust.claimsCaution) {
    score += (claimCount30Days / THRESHOLDS.userTrust.claimsHighRisk) * 25;
  }
  score += Math.min(priorDenials * THRESHOLDS.userTrust.priorDenialPenaltyPer, THRESHOLDS.userTrust.priorDenialMax);
  if (restaurantRepeatCount >= THRESHOLDS.userTrust.repeatHighRisk) score += 25;
  else if (restaurantRepeatCount > 0) score += restaurantRepeatCount * 6;
  score = clamp(score);

  let explanation;
  if (claimCount30Days >= THRESHOLDS.userTrust.claimsHighRisk) {
    explanation = `${claimCount30Days} claims filed in 30 days with ${priorDenials} prior denials — high-volume fraud pattern.`;
  } else if (priorDenials >= 3) {
    explanation = `${priorDenials} prior denied claims indicate a history of fraudulent filings.`;
  } else if (restaurantRepeatCount >= THRESHOLDS.userTrust.repeatHighRisk) {
    explanation = `${restaurantRepeatCount} claims against the same restaurant — systematic repeat targeting detected.`;
  } else if (claimCount30Days === 0 && priorDenials === 0) {
    explanation = `Clean user history: no prior claims or denials on record.`;
  } else {
    explanation = `${claimCount30Days} claims this month, ${priorDenials} prior denials — moderate risk profile.`;
  }
  return { score, explanation };
}

function scoreDeliveryVerification(signals) {
  const { deliveryToComplaintMinutes = 30, hasQRSeal = true, restaurantRepeatCount = 0 } = signals;
  let score = 0;
  if (deliveryToComplaintMinutes < THRESHOLDS.delivery.complaintImmediateHighRisk) {
    score += 45;
  } else if (deliveryToComplaintMinutes < THRESHOLDS.delivery.complaintFastCaution) {
    const ratio = 1 - (deliveryToComplaintMinutes - THRESHOLDS.delivery.complaintImmediateHighRisk) /
      (THRESHOLDS.delivery.complaintFastCaution - THRESHOLDS.delivery.complaintImmediateHighRisk);
    score += ratio * 30;
  } else if (deliveryToComplaintMinutes > THRESHOLDS.delivery.complaintLate) {
    score += 8;
  }
  if (!hasQRSeal) score += THRESHOLDS.delivery.noSealPenalty;
  if (restaurantRepeatCount >= THRESHOLDS.delivery.repeatHighRisk) score += 20;
  score = clamp(score);

  let explanation;
  if (deliveryToComplaintMinutes < THRESHOLDS.delivery.complaintImmediateHighRisk) {
    explanation = `Complaint filed ${deliveryToComplaintMinutes}m after delivery — impossible timing for genuine consumption.`;
  } else if (!hasQRSeal && deliveryToComplaintMinutes < THRESHOLDS.delivery.complaintFastCaution) {
    explanation = `No QR tamper seal + complaint within ${deliveryToComplaintMinutes}m of delivery — dual risk flag.`;
  } else if (!hasQRSeal) {
    explanation = `QR tamper seal absent — delivery authenticity unverifiable.`;
  } else if (deliveryToComplaintMinutes >= 20) {
    explanation = `Delivery verification passed: ${deliveryToComplaintMinutes}m post-delivery complaint with intact QR seal.`;
  } else {
    explanation = `Delivery timing (${deliveryToComplaintMinutes}m) and seal status reviewed — within acceptable range.`;
  }
  return { score, explanation };
}

function scoreNetworkFraudGraph(signals) {
  const { sharedIPCount = 0, vpnDetected = false, claimCount30Days = 0 } = signals;
  let score = 0;
  if (sharedIPCount >= THRESHOLDS.network.sharedIPHighRisk) score += 45;
  else if (sharedIPCount >= THRESHOLDS.network.sharedIPCaution) score += (sharedIPCount / THRESHOLDS.network.sharedIPHighRisk) * 30;
  if (vpnDetected) score += THRESHOLDS.network.vpnPenalty;
  if (claimCount30Days >= THRESHOLDS.network.burstHighRisk) score += 15;
  score = clamp(score);

  let explanation;
  if (vpnDetected && sharedIPCount >= THRESHOLDS.network.sharedIPHighRisk) {
    explanation = `VPN active + IP shared with ${sharedIPCount} fraud accounts — network fraud ring confirmed.`;
  } else if (sharedIPCount >= THRESHOLDS.network.sharedIPHighRisk) {
    explanation = `IP shared with ${sharedIPCount} flagged accounts — coordinated fraud ring suspected.`;
  } else if (vpnDetected) {
    explanation = `VPN/proxy detected — active identity obfuscation.`;
  } else if (sharedIPCount >= THRESHOLDS.network.sharedIPCaution) {
    explanation = `IP shared with ${sharedIPCount} accounts — possible coordinated activity.`;
  } else {
    explanation = `Network profile clean: no VPN, no shared flagged IPs.`;
  }
  return { score, explanation };
}

function getVerdict(compositeScore) {
  if (compositeScore >= VERDICT_THRESHOLDS.fraud) return 'FRAUD';
  if (compositeScore >= VERDICT_THRESHOLDS.review) return 'REVIEW';
  return 'LEGITIMATE';
}

// ── ML service call ────────────────────────────────────────────────────────

async function callMLService(signals) {
  try {
    const resp = await axios.post(`${ML_SERVICE_URL}/predict`, signals, {
      timeout: ML_TIMEOUT_MS,
    });
    return resp.data;
  } catch {
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────

async function analyzeClaimFraud(signals) {
  const startTime = Date.now();

  const photo     = scorePhotoForensics(signals);
  const behavioral = scoreBehavioralBiometrics(signals);
  const userTrust  = scoreUserTrust(signals);
  const delivery   = scoreDeliveryVerification(signals);
  const network    = scoreNetworkFraudGraph(signals);

  const ruleScore = Math.round(
    photo.score      * WEIGHTS.photoForensics +
    behavioral.score * WEIGHTS.behavioralBiometrics +
    userTrust.score  * WEIGHTS.userTrustScore +
    delivery.score   * WEIGHTS.deliveryVerification +
    network.score    * WEIGHTS.networkFraudGraph
  );

  // Call ML service (non-blocking; falls back gracefully)
  const mlResult = await callMLService(signals);

  let compositeScore = ruleScore;
  let mlInsights = null;

  if (mlResult) {
    // Blend: 55% ML probability-derived score + 45% rule-based score
    const mlScore = Math.round(mlResult.ml_fraud_probability * 100);
    compositeScore = Math.round(mlScore * 0.55 + ruleScore * 0.45);
    compositeScore = clamp(compositeScore);

    mlInsights = {
      mlFraudProbability: mlResult.ml_fraud_probability,
      anomalyScore: mlResult.anomaly_score,
      mlVerdict: mlResult.ml_verdict,
      modelConfidence: mlResult.model_confidence,
      featureImportances: mlResult.feature_importances,
      riskContributions: mlResult.risk_contributions,
      modelUsed: 'GradientBoosting+IsolationForest',
      mlAvailable: true,
    };
  } else {
    mlInsights = { mlAvailable: false, modelUsed: 'rule-based-fallback' };
  }

  const verdict = getVerdict(compositeScore);
  const processingTimeMs = Date.now() - startTime;

  return {
    layerScores: {
      photoForensics:       Math.round(photo.score),
      behavioralBiometrics: Math.round(behavioral.score),
      userTrustScore:       Math.round(userTrust.score),
      deliveryVerification: Math.round(delivery.score),
      networkFraudGraph:    Math.round(network.score),
    },
    layerExplanations: {
      photoForensics:       photo.explanation,
      behavioralBiometrics: behavioral.explanation,
      userTrustScore:       userTrust.explanation,
      deliveryVerification: delivery.explanation,
      networkFraudGraph:    network.explanation,
    },
    ruleScore,
    compositeScore,
    verdict,
    processingTimeMs,
    weights: WEIGHTS,
    mlInsights,
  };
}

module.exports = { analyzeClaimFraud, WEIGHTS, THRESHOLDS, VERDICT_THRESHOLDS };
