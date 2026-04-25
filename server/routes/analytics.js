const express = require('express');
const authMiddleware = require('../middleware/auth');
const Claim = require('../models/Claim');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalClaims, fraudClaims, reviewClaims, legitimateClaims] = await Promise.all([
      Claim.countDocuments(),
      Claim.countDocuments({ verdict: 'FRAUD' }),
      Claim.countDocuments({ verdict: 'REVIEW' }),
      Claim.countDocuments({ verdict: 'LEGITIMATE' }),
    ]);

    const fraudAmountResult = await Claim.aggregate([
      { $match: { verdict: 'FRAUD' } },
      { $group: { _id: null, total: { $sum: '$claimAmount' } } },
    ]);
    const fraudAmountSaved = fraudAmountResult[0]?.total || 0;

    const autoResolutionRate = totalClaims > 0
      ? Math.round(((fraudClaims + legitimateClaims) / totalClaims) * 100)
      : 0;

    const avgScoreResult = await Claim.aggregate([
      { $group: { _id: null, avg: { $avg: '$compositeScore' } } },
    ]);
    const avgCompositeScore = Math.round(avgScoreResult[0]?.avg || 0);

    const humanOverridesCount = await Claim.countDocuments({
      'humanDecision.decidedAt': { $ne: null },
    });

    // Trend: last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendRaw = await Claim.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            verdict: '$verdict',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const trendMap = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: dayNames[d.getDay()], FRAUD: 0, REVIEW: 0, LEGITIMATE: 0 };
    }
    trendRaw.forEach(({ _id, count }) => {
      if (trendMap[_id.date]) trendMap[_id.date][_id.verdict] = count;
    });
    const trend = Object.values(trendMap);

    // Platform breakdown
    const platformRaw = await Claim.aggregate([
      {
        $group: {
          _id: { platform: '$platform', verdict: '$verdict' },
          count: { $sum: 1 },
          avgScore: { $avg: '$compositeScore' },
        },
      },
    ]);
    const platformMap = {};
    platformRaw.forEach(({ _id, count, avgScore }) => {
      if (!platformMap[_id.platform]) {
        platformMap[_id.platform] = { platform: _id.platform, FRAUD: 0, REVIEW: 0, LEGITIMATE: 0, total: 0, avgScore: 0 };
      }
      platformMap[_id.platform][_id.verdict] = count;
      platformMap[_id.platform].total += count;
    });
    // Compute avg score per platform
    const platformAvgRaw = await Claim.aggregate([
      { $group: { _id: '$platform', avgScore: { $avg: '$compositeScore' } } },
    ]);
    platformAvgRaw.forEach(({ _id, avgScore }) => {
      if (platformMap[_id]) platformMap[_id].avgScore = Math.round(avgScore);
    });
    const platforms = Object.values(platformMap);

    // Top flags from FRAUD claims
    const topFlagsRaw = await Claim.aggregate([
      { $match: { verdict: 'FRAUD' } },
      {
        $group: {
          _id: null,
          avgPhotoManipulationScore: { $avg: '$signals.photoManipulationScore' },
          avgClaimCount30Days: { $avg: '$signals.claimCount30Days' },
          avgSharedIPCount: { $avg: '$signals.sharedIPCount' },
          avgTimeToComplaintSeconds: { $avg: '$signals.timeToComplaintSeconds' },
          vpnCount: { $sum: { $cond: ['$signals.vpnDetected', 1, 0] } },
          aiPhotoCount: { $sum: { $cond: ['$signals.photoIsAIGenerated', 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);
    const tf = topFlagsRaw[0] || {};
    const topFlags = {
      avgPhotoManipulationScore: Math.round(tf.avgPhotoManipulationScore || 0),
      avgClaimCount30Days: Math.round(tf.avgClaimCount30Days || 0),
      avgSharedIPCount: Math.round(tf.avgSharedIPCount || 0),
      vpnDetectedPercent: tf.total > 0 ? Math.round((tf.vpnCount / tf.total) * 100) : 0,
      aiGeneratedPhotoPercent: tf.total > 0 ? Math.round((tf.aiPhotoCount / tf.total) * 100) : 0,
      avgTimeToComplaintSeconds: Math.round(tf.avgTimeToComplaintSeconds || 0),
    };

    // Claim type breakdown
    const claimTypeRaw = await Claim.aggregate([
      {
        $group: {
          _id: '$claimType',
          count: { $sum: 1 },
          fraudCount: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } },
          avgScore: { $avg: '$compositeScore' },
          totalAmount: { $sum: '$claimAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const claimTypeBreakdown = claimTypeRaw.map(row => ({
      type: row._id,
      count: row.count,
      fraudRate: row.count > 0 ? Math.round((row.fraudCount / row.count) * 100) : 0,
      avgScore: Math.round(row.avgScore || 0),
      totalAmount: row.totalAmount || 0,
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalClaims, fraudClaims, reviewClaims, legitimateClaims,
          fraudAmountSaved, autoResolutionRate, avgCompositeScore, humanOverridesCount,
        },
        trend,
        platforms,
        topFlags,
        claimTypeBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/recent
router.get('/recent', async (req, res) => {
  try {
    const claims = await Claim.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .select('claimId platform userName restaurantName claimAmount compositeScore verdict claimType createdAt')
      .lean();
    res.json({ success: true, data: claims });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/score-distribution — histogram in 10-point buckets
router.get('/score-distribution', async (req, res) => {
  try {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${i * 10 + 9}`,
      min: i * 10,
      max: i * 10 + 10,
      FRAUD: 0, REVIEW: 0, LEGITIMATE: 0, total: 0,
    }));

    const claims = await Claim.find({}, { compositeScore: 1, verdict: 1 }).lean();
    claims.forEach(({ compositeScore, verdict }) => {
      const idx = Math.min(Math.floor(compositeScore / 10), 9);
      buckets[idx][verdict]++;
      buckets[idx].total++;
    });

    res.json({ success: true, data: buckets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/risk-matrix — platform × claimType fraud rate heatmap
router.get('/risk-matrix', async (req, res) => {
  try {
    const raw = await Claim.aggregate([
      {
        $group: {
          _id: { platform: '$platform', claimType: '$claimType' },
          total: { $sum: 1 },
          fraud: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } },
          avgScore: { $avg: '$compositeScore' },
        },
      },
    ]);

    const matrix = {};
    const platforms = new Set();
    const claimTypes = new Set();

    raw.forEach(({ _id, total, fraud, avgScore }) => {
      platforms.add(_id.platform);
      claimTypes.add(_id.claimType);
      const key = `${_id.platform}__${_id.claimType}`;
      matrix[key] = {
        platform: _id.platform,
        claimType: _id.claimType,
        total,
        fraud,
        fraudRate: total > 0 ? Math.round((fraud / total) * 100) : 0,
        avgScore: Math.round(avgScore || 0),
      };
    });

    res.json({
      success: true,
      data: {
        matrix: Object.values(matrix),
        platforms: [...platforms],
        claimTypes: [...claimTypes],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/top-risky-users — top 10 users by avg fraud score
router.get('/top-risky-users', async (req, res) => {
  try {
    const users = await Claim.aggregate([
      {
        $group: {
          _id: '$userName',
          avgScore: { $avg: '$compositeScore' },
          totalClaims: { $sum: 1 },
          fraudClaims: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } },
          totalAmount: { $sum: '$claimAmount' },
        },
      },
      { $match: { totalClaims: { $gte: 1 } } },
      { $sort: { avgScore: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: users.map(u => ({
        userName: u._id,
        avgScore: Math.round(u.avgScore),
        totalClaims: u.totalClaims,
        fraudClaims: u.fraudClaims,
        fraudRate: Math.round((u.fraudClaims / u.totalClaims) * 100),
        totalAmount: u.totalAmount,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
