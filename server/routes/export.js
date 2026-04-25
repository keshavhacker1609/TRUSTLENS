const express = require('express');
const jwt = require('jsonwebtoken');
const Claim = require('../models/Claim');

const router = express.Router();

// Allow token via query param for direct browser downloads
function exportAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

router.use(exportAuth);

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().replace('T', ' ').slice(0, 19);
}

// GET /api/export/claims - Download CSV with optional filters
router.get('/claims', async (req, res) => {
  try {
    const { platform, verdict, startDate, endDate, search } = req.query;

    const filter = {};
    if (platform) filter.platform = platform;
    if (verdict) filter.verdict = verdict;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (search) {
      filter.$or = [
        { claimId: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { restaurantName: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
      ];
    }

    const claims = await Claim.find(filter).sort({ createdAt: -1 }).lean();

    const headers = [
      'Claim ID',
      'Platform',
      'Restaurant',
      'User',
      'Claim Type',
      'Amount (INR)',
      'Composite Score',
      'Verdict',
      'Photo Score',
      'Behavioral Score',
      'Trust Score',
      'Delivery Score',
      'Network Score',
      'Filed At',
      'Human Decision',
      'Human Reason',
    ];

    const rows = claims.map(c => [
      escapeCSV(c.claimId),
      escapeCSV(c.platform),
      escapeCSV(c.restaurantName),
      escapeCSV(c.userName),
      escapeCSV(c.claimType),
      escapeCSV(c.claimAmount),
      escapeCSV(c.compositeScore),
      escapeCSV(c.verdict),
      escapeCSV(c.layerScores?.photoForensics ?? ''),
      escapeCSV(c.layerScores?.behavioralBiometrics ?? ''),
      escapeCSV(c.layerScores?.userTrustScore ?? ''),
      escapeCSV(c.layerScores?.deliveryVerification ?? ''),
      escapeCSV(c.layerScores?.networkFraudGraph ?? ''),
      escapeCSV(formatDate(c.createdAt)),
      escapeCSV(c.humanDecision?.verdict ?? ''),
      escapeCSV(c.humanDecision?.reason ?? ''),
    ]);

    const csvLines = [headers.join(','), ...rows.map(r => r.join(','))];
    const csv = csvLines.join('\r\n');

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=trustlens-claims-${today}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
