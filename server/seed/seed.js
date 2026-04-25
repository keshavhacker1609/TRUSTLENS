require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { analyzeClaimFraud } = require('../services/fraudEngine');

const FIRST_NAMES = [
  'Priya', 'Rahul', 'Anjali', 'Arjun', 'Neha', 'Vikram', 'Kavya', 'Rohit',
  'Sneha', 'Amit', 'Divya', 'Karan', 'Pooja', 'Suresh', 'Meera', 'Aditya',
  'Shreya', 'Mohit', 'Ananya', 'Rajesh',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Mehta',
  'Joshi', 'Shah', 'Iyer', 'Nair', 'Reddy', 'Malhotra', 'Bose', 'Das',
];

const RESTAURANTS = [
  'Spice Garden', 'Biryani Blues', 'The Curry House', 'Pizza Point', 'Burger Barn',
  'Dosa Palace', 'Tandoor Express', 'Wok & Roll', 'Saffron Kitchen', 'Masala Magic',
  'Subway Grill', 'Chinese Dragon', 'South Indian Kitchen', 'The Kebab Spot', 'Fresh Bites',
  'Grill Station', 'Mumbai Tiffin', 'Royal Biryani', 'Street Food Hub', 'Pasta Palace',
];

const PLATFORMS = [
  ...Array(35).fill('zomato'),
  ...Array(30).fill('swiggy'),
  ...Array(20).fill('blinkit'),
  ...Array(15).fill('zepto'),
];

const CLAIM_TYPES = [
  ...Array(40).fill('contamination'),
  ...Array(30).fill('missing_item'),
  ...Array(20).fill('wrong_order'),
  ...Array(10).fill('quality'),
];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(maxDaysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - rnd(0, maxDaysAgo));
  d.setHours(rnd(7, 23), rnd(0, 59), rnd(0, 59), 0);
  return d;
}

function userName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function orderId() {
  return `ORD-${rnd(100000, 999999)}`;
}

function fraudSignals() {
  return {
    photoManipulationScore: rnd(60, 95),
    photoIsAIGenerated: Math.random() < 0.5,
    timeToComplaintSeconds: rnd(10, 55),
    typingSpeedWPM: rnd(120, 280),
    navigationAnomalyScore: rnd(50, 90),
    claimCount30Days: rnd(4, 8),
    priorDenials: rnd(2, 5),
    restaurantRepeatCount: rnd(2, 6),
    deliveryToComplaintMinutes: rnd(1, 4),
    hasQRSeal: Math.random() < 0.2,
    sharedIPCount: rnd(3, 8),
    vpnDetected: Math.random() < 0.7,
  };
}

function reviewSignals() {
  return {
    photoManipulationScore: rnd(25, 55),
    photoIsAIGenerated: false,
    timeToComplaintSeconds: rnd(60, 300),
    typingSpeedWPM: rnd(45, 90),
    navigationAnomalyScore: rnd(25, 55),
    claimCount30Days: rnd(2, 4),
    priorDenials: rnd(1, 2),
    restaurantRepeatCount: rnd(0, 2),
    deliveryToComplaintMinutes: rnd(5, 20),
    hasQRSeal: Math.random() < 0.5,
    sharedIPCount: rnd(0, 2),
    vpnDetected: Math.random() < 0.2,
  };
}

function legitimateSignals() {
  return {
    photoManipulationScore: rnd(0, 20),
    photoIsAIGenerated: false,
    timeToComplaintSeconds: rnd(300, 2400),
    typingSpeedWPM: rnd(25, 55),
    navigationAnomalyScore: rnd(5, 25),
    claimCount30Days: rnd(0, 1),
    priorDenials: 0,
    restaurantRepeatCount: rnd(0, 1),
    deliveryToComplaintMinutes: rnd(20, 180),
    hasQRSeal: Math.random() < 0.8,
    sharedIPCount: 0,
    vpnDetected: false,
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Claim.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const adminUser = new User({
      email: 'admin@trustlens.io',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
    });
    await adminUser.save();

    const analystUser = new User({
      email: 'analyst@trustlens.io',
      password: 'analyst123',
      name: 'Priya Analyst',
      role: 'analyst',
    });
    await analystUser.save();

    console.log('Created users: admin@trustlens.io / admin123, analyst@trustlens.io / analyst123');

    const claimsToInsert = [];
    let idx = 0;

    function buildClaim(signals, targetVerdict, amountRange) {
      const analysis = analyzeClaimFraud(signals);
      let score = analysis.compositeScore;

      // Force score into correct range for seed consistency
      if (targetVerdict === 'FRAUD' && score < 65) score = rnd(65, 90);
      if (targetVerdict === 'REVIEW' && (score < 35 || score > 64)) score = rnd(38, 62);
      if (targetVerdict === 'LEGITIMATE' && score > 34) score = rnd(5, 30);

      const createdAt = randomDate(30);
      const claimId = `TL-${String(1001 + idx).padStart(5, '0')}`;
      idx++;

      return {
        claimId,
        userId: `seed-user-${idx}`,
        userName: userName(),
        platform: pick(PLATFORMS),
        orderId: orderId(),
        restaurantName: pick(RESTAURANTS),
        claimType: pick(CLAIM_TYPES),
        claimAmount: rnd(...amountRange),
        signals,
        layerScores: analysis.layerScores,
        layerExplanations: analysis.layerExplanations,
        weights: analysis.weights,
        compositeScore: score,
        verdict: targetVerdict,
        status: targetVerdict.toLowerCase(),
        createdAt,
        updatedAt: createdAt,
      };
    }

    // 20 FRAUD claims
    for (let i = 0; i < 20; i++) {
      claimsToInsert.push(buildClaim(fraudSignals(), 'FRAUD', [200, 1200]));
    }

    // 15 REVIEW claims
    for (let i = 0; i < 15; i++) {
      claimsToInsert.push(buildClaim(reviewSignals(), 'REVIEW', [150, 800]));
    }

    // 15 LEGITIMATE claims
    for (let i = 0; i < 15; i++) {
      claimsToInsert.push(buildClaim(legitimateSignals(), 'LEGITIMATE', [100, 600]));
    }

    // Insert all claims
    await Claim.insertMany(claimsToInsert);
    console.log(`Inserted ${claimsToInsert.length} claims`);

    // Give 3 REVIEW claims human decisions
    const reviewClaims = claimsToInsert.filter(c => c.verdict === 'REVIEW').slice(0, 3);

    if (reviewClaims.length >= 3) {
      const [r1, r2, r3] = reviewClaims;

      await Claim.updateOne({ claimId: r1.claimId }, {
        $set: {
          verdict: 'FRAUD',
          status: 'fraud',
          'humanDecision.verdict': 'FRAUD',
          'humanDecision.reason': 'Multiple signals confirm coordinated fraud ring — IP shared with 6 other flagged accounts.',
          'humanDecision.analystId': analystUser._id.toString(),
          'humanDecision.analystName': analystUser.name,
          'humanDecision.decidedAt': new Date(Date.now() - 3600000),
        },
      });

      await Claim.updateOne({ claimId: r2.claimId }, {
        $set: {
          verdict: 'FRAUD',
          status: 'fraud',
          'humanDecision.verdict': 'FRAUD',
          'humanDecision.reason': 'Photo confirmed AI-generated after manual review. Claimant has 4 prior denials.',
          'humanDecision.analystId': analystUser._id.toString(),
          'humanDecision.analystName': analystUser.name,
          'humanDecision.decidedAt': new Date(Date.now() - 7200000),
        },
      });

      await Claim.updateOne({ claimId: r3.claimId }, {
        $set: {
          verdict: 'LEGITIMATE',
          status: 'legitimate',
          'humanDecision.verdict': 'LEGITIMATE',
          'humanDecision.reason': 'Customer contacted restaurant directly. Issue confirmed genuine — wrong order delivered.',
          'humanDecision.analystId': adminUser._id.toString(),
          'humanDecision.analystName': adminUser.name,
          'humanDecision.decidedAt': new Date(Date.now() - 1800000),
        },
      });

      console.log('Applied human decisions to 3 REVIEW claims');
    }

    console.log('\n=== Seed completed successfully ===');
    console.log('Login: admin@trustlens.io / admin123');
    console.log('Login: analyst@trustlens.io / analyst123');
    console.log('=====================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
