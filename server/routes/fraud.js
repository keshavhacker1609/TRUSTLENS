const express = require('express');
const authMiddleware = require('../middleware/auth');
const { analyzeClaimFraud } = require('../services/fraudEngine');

const router = express.Router();

router.use(authMiddleware);

// POST /api/fraud/analyze - Demo mode analysis without DB save
router.post('/analyze', async (req, res) => {
  try {
    const signals = req.body.signals || req.body;

    const result = await analyzeClaimFraud(signals);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
