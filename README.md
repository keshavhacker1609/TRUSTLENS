# TrustLens

> AI-powered refund fraud detection platform for Indian food delivery ecosystems

TrustLens combines a deterministic 5-layer scoring engine with a trained GradientBoosting ML classifier and IsolationForest anomaly detection to deliver sub-400ms real-time fraud verdicts on refund claims across Zomato, Swiggy, Blinkit, and Zepto.

---

## Screenshots

| Dashboard | Analytics | Run Analysis |
|-----------|-----------|--------------|
| Real-time fraud metrics + live claim feed | Score histogram · Risk heatmap · Top users | 5-layer results + ML insights + Radar chart |

---

## Features

- **5-Layer Fraud Engine** — Photo Forensics, Behavioral Biometrics, User Trust Score, Delivery Verification, Network Fraud Graph — each independently scored, weighted, and explained
- **ML Hybrid Scoring** — GradientBoostingClassifier (150 estimators) + IsolationForest anomaly detection blended 55/45 with rule-based scores
- **Real-time Dashboard** — Live claim feed via Socket.IO, 7-day trend chart, platform risk rates, verdict distribution
- **Analytics Page** — Score distribution histogram, platform × claim-type risk heatmap, fraud rate by claim type, top high-risk users
- **Run Analysis** — Interactive signal configurator with tabbed results: Layer Breakdown / Radar Chart / ML Insights (fraud probability, anomaly score, feature contributions)
- **Claims Management** — Paginated table with filters (platform, verdict, date range, search), user avatars, CSV export
- **Human Override** — Analysts can override AI verdicts with reasons; full AuditLog trail
- **JWT Auth** — Admin and Analyst roles, Zustand state with localStorage hydration

---

## Architecture

```
Browser (React + Vite)          :5173
    └── API Server (Node.js + Express + Socket.IO)   :5000
          ├── MongoDB (Mongoose + 4 compound indexes)
          └── ML Microservice (FastAPI + scikit-learn) :5001
                ├── GradientBoostingClassifier
                └── IsolationForest
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Zustand, React Router v6 |
| Charts | Recharts, Framer Motion |
| API Server | Node.js, Express, Socket.IO |
| Database | MongoDB 8, Mongoose |
| Auth | JWT (HS256), bcrypt |
| ML Service | Python, FastAPI, scikit-learn 1.8 |
| ML Models | GradientBoostingClassifier, IsolationForest |

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 8 (running locally)
- Python 3.10+

### 1. Install dependencies

```bash
# Root (runs both client + server installs)
npm install

# ML service
pip install fastapi uvicorn scikit-learn numpy pandas
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set MONGO_URI and JWT_SECRET
```

### 3. Seed the database

```bash
npm run seed
```

Creates 50 logically consistent claims (20 FRAUD / 15 REVIEW / 15 LEGITIMATE) and two demo users.

### 4. Start all services

```bash
# Terminal 1 — ML microservice (port 5001)
cd ml_service && python main.py

# Terminal 2 — API server (port 5000)
npm run dev:server

# Terminal 3 — Frontend (port 5173)
npm run dev:client
```

Open **http://localhost:5173**

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@trustlens.io | admin123 |
| Analyst | analyst@trustlens.io | analyst123 |

---

## Fraud Scoring Model

### Layer Weights

| Layer | Weight | Signals |
|-------|--------|---------|
| Photo Forensics | 25% | Manipulation score, AI-generated detection |
| Behavioral Biometrics | 20% | Complaint timing, typing WPM, navigation anomaly |
| User Trust Score | 25% | Claim frequency, prior denials, restaurant repeats |
| Delivery Verification | 15% | QR seal, delivery-to-complaint window |
| Network Fraud Graph | 15% | VPN, shared IP clusters, burst activity |

### Verdict Thresholds

```
Score >= 65  →  FRAUD
Score 35–64  →  REVIEW
Score < 35   →  LEGITIMATE
```

### ML Blend

```
final_score = round(ml_fraud_probability * 100 * 0.55 + rule_score * 0.45)
```

Falls back to pure rule-based scoring if ML service is unavailable.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/claims` | Paginated claims (filters: platform, verdict, search, dates) |
| POST | `/api/claims` | Submit + analyze new claim |
| GET | `/api/claims/:id` | Full claim with layer breakdown + ML insights |
| PATCH | `/api/claims/:id/decision` | Human override verdict |
| POST | `/api/fraud/analyze` | Live analysis (no DB save) |
| GET | `/api/analytics/dashboard` | Overview, trend, platforms, claim types |
| GET | `/api/analytics/score-distribution` | Score histogram (10-point buckets) |
| GET | `/api/analytics/risk-matrix` | Platform × ClaimType fraud rate heatmap |
| GET | `/api/analytics/top-risky-users` | Top 10 users by avg fraud score |
| GET | `/api/export/claims` | CSV download with active filters |

---

## Project Structure

```
TRUSTLENS/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/           # Dashboard, Claims, Analytics, Analyze, ClaimDetail, Login
│       ├── components/      # Layout, Sidebar, ScoreGauge, LayerBar, VerdictBadge …
│       ├── store/           # Zustand stores (auth, ui)
│       └── api/             # Axios instance
├── server/                  # Node.js + Express backend
│   ├── routes/              # auth, claims, fraud, analytics, export
│   ├── models/              # Claim, User, AuditLog (Mongoose)
│   ├── services/            # fraudEngine.js (5-layer + ML blend)
│   └── seed/                # seed.js — 50 realistic claims
└── ml_service/              # Python FastAPI ML microservice
    └── main.py              # GradientBoosting + IsolationForest
```

---

## License

MIT
