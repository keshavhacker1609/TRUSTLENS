const express = require('express');
const authMiddleware = require('../middleware/auth');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { analyzeClaimFraud } = require('../services/fraudEngine');

const router = express.Router();

router.use(authMiddleware);

// POST /api/claims - Submit a new claim, run all 5 layers, save result
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      userName,
      platform,
      orderId,
      restaurantName,
      claimType,
      claimAmount,
      signals = {},
    } = req.body;

    if (!platform || !orderId || !restaurantName || !claimType || !claimAmount) {
      return res.status(400).json({ success: false, error: 'Missing required claim fields' });
    }

    if (!userName) {
      return res.status(400).json({ success: false, error: 'userName is required' });
    }

    const analysisResult = await analyzeClaimFraud(signals);

    const claim = await Claim.create({
      userId: userId || req.user.id,
      userName,
      platform,
      orderId,
      restaurantName,
      claimType,
      claimAmount,
      signals,
      layerScores: analysisResult.layerScores,
      layerExplanations: analysisResult.layerExplanations,
      weights: analysisResult.weights,
      compositeScore: analysisResult.compositeScore,
      verdict: analysisResult.verdict,
    });

    await AuditLog.create({
      claimId: claim.claimId,
      action: 'CLAIM_SUBMITTED',
      analystId: req.user.id,
      analystName: req.user.name,
      after: { verdict: analysisResult.verdict, compositeScore: analysisResult.compositeScore },
      reason: 'Claim submitted and analyzed by AI engine',
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('newClaim', {
        claimId: claim.claimId,
        platform: claim.platform,
        userName: claim.userName,
        restaurantName: claim.restaurantName,
        claimAmount: claim.claimAmount,
        compositeScore: claim.compositeScore,
        verdict: claim.verdict,
        createdAt: claim.createdAt,
      });
    }

    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/claims - Paginated list with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      platform,
      verdict,
      startDate,
      endDate,
      search,
    } = req.query;

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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Claim.countDocuments(filter);
    const claims = await Claim.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/claims/:id - Full claim with 5-layer breakdown
router.get('/:id', async (req, res) => {
  try {
    const idParam = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);

    const query = isObjectId
      ? { $or: [{ _id: idParam }, { claimId: idParam }] }
      : { claimId: idParam };

    const claim = await Claim.findOne(query).lean();

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/claims/:id/decision - Human override
router.patch('/:id/decision', async (req, res) => {
  try {
    const { verdict, reason } = req.body;

    if (!verdict || !['FRAUD', 'LEGITIMATE'].includes(verdict)) {
      return res.status(400).json({ success: false, error: 'verdict must be FRAUD or LEGITIMATE' });
    }
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'A reason is required for human override' });
    }

    const idParam = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const query = isObjectId
      ? { $or: [{ _id: idParam }, { claimId: idParam }] }
      : { claimId: idParam };

    const claim = await Claim.findOne(query);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const prevVerdict = claim.verdict;

    claim.humanDecision = {
      verdict,
      reason: reason.trim(),
      analystId: req.user.id,
      analystName: req.user.name,
      decidedAt: new Date(),
    };
    claim.verdict = verdict;

    await claim.save();

    await AuditLog.create({
      claimId: claim.claimId,
      action: 'HUMAN_OVERRIDE',
      analystId: req.user.id,
      analystName: req.user.name,
      before: { verdict: prevVerdict },
      after: { verdict },
      reason: reason.trim(),
    });

    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
