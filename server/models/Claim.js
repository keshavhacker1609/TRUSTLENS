const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claimId: {
    type: String,
    unique: true,
  },
  userId: {
    type: String,
    default: 'system',
  },
  userName: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ['zomato', 'swiggy', 'blinkit', 'zepto'],
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  restaurantName: {
    type: String,
    required: true,
  },
  claimType: {
    type: String,
    enum: ['contamination', 'missing_item', 'wrong_order', 'quality'],
    required: true,
  },
  claimAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'fraud', 'review', 'legitimate'],
    default: 'pending',
  },

  signals: {
    timeToComplaintSeconds: { type: Number, default: 0 },
    typingSpeedWPM: { type: Number, default: 0 },
    claimCount30Days: { type: Number, default: 0 },
    priorDenials: { type: Number, default: 0 },
    sharedIPCount: { type: Number, default: 0 },
    vpnDetected: { type: Boolean, default: false },
    deliveryToComplaintMinutes: { type: Number, default: 0 },
    hasQRSeal: { type: Boolean, default: false },
    restaurantRepeatCount: { type: Number, default: 0 },
    photoManipulationScore: { type: Number, default: 0 },
    photoIsAIGenerated: { type: Boolean, default: false },
    navigationAnomalyScore: { type: Number, default: 0 },
  },

  layerScores: {
    photoForensics: { type: Number, default: 0 },
    behavioralBiometrics: { type: Number, default: 0 },
    userTrustScore: { type: Number, default: 0 },
    deliveryVerification: { type: Number, default: 0 },
    networkFraudGraph: { type: Number, default: 0 },
  },

  layerExplanations: {
    photoForensics: { type: String, default: '' },
    behavioralBiometrics: { type: String, default: '' },
    userTrustScore: { type: String, default: '' },
    deliveryVerification: { type: String, default: '' },
    networkFraudGraph: { type: String, default: '' },
  },

  weights: {
    photoForensics: { type: Number, default: 0.25 },
    behavioralBiometrics: { type: Number, default: 0.20 },
    userTrustScore: { type: Number, default: 0.25 },
    deliveryVerification: { type: Number, default: 0.15 },
    networkFraudGraph: { type: Number, default: 0.15 },
  },

  compositeScore: {
    type: Number,
    default: 0,
  },

  verdict: {
    type: String,
    enum: ['FRAUD', 'REVIEW', 'LEGITIMATE'],
    default: 'REVIEW',
  },

  humanDecision: {
    verdict: { type: String, enum: ['FRAUD', 'LEGITIMATE', null], default: null },
    reason: { type: String, default: '' },
    analystId: { type: String, default: null },
    analystName: { type: String, default: null },
    decidedAt: { type: Date, default: null },
  },
}, {
  timestamps: true,
});

// Auto-generate claimId before saving
claimSchema.pre('save', async function (next) {
  if (!this.claimId) {
    const count = await mongoose.model('Claim').countDocuments();
    this.claimId = `TL-${String(count + 1001).padStart(5, '0')}`;
  }
  next();
});

// Sync status with verdict
claimSchema.pre('save', function (next) {
  if (this.verdict === 'FRAUD') this.status = 'fraud';
  else if (this.verdict === 'REVIEW') this.status = 'review';
  else if (this.verdict === 'LEGITIMATE') this.status = 'legitimate';
  next();
});

// Indexes
claimSchema.index({ verdict: 1, createdAt: -1 });
claimSchema.index({ platform: 1, createdAt: -1 });
claimSchema.index({ compositeScore: -1 });
claimSchema.index({ userName: 'text', restaurantName: 'text', claimId: 'text', orderId: 'text' });

module.exports = mongoose.model('Claim', claimSchema);
