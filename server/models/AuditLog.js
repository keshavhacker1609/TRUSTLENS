const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  claimId: { type: String, required: true },
  action: {
    type: String,
    enum: ['AI_VERDICT', 'HUMAN_OVERRIDE', 'CLAIM_SUBMITTED'],
    required: true,
  },
  analystId: { type: String, default: null },
  analystName: { type: String, default: null },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ claimId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
