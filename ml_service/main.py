"""
TrustLens ML Microservice
FastAPI + scikit-learn: IsolationForest anomaly detection + GradientBoosting classifier
Runs on port 5001, called by Node.js fraudEngine
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="TrustLens ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Synthetic training data — matches real 5-layer signal distribution
# 300 samples: 120 FRAUD, 90 REVIEW, 90 LEGITIMATE
# ---------------------------------------------------------------------------
def _generate_training_data():
    rng = np.random.default_rng(42)

    def fraud_sample(n):
        return np.column_stack([
            rng.uniform(60, 100, n),      # photoManipulationScore
            rng.choice([0, 1], n, p=[0.2, 0.8]),  # photoIsAIGenerated
            rng.uniform(5, 55, n),        # timeToComplaintSeconds
            rng.uniform(120, 300, n),     # typingSpeedWPM
            rng.uniform(55, 100, n),      # navigationAnomalyScore
            rng.integers(5, 12, n),       # claimCount30Days
            rng.integers(2, 6, n),        # priorDenials
            rng.integers(3, 8, n),        # restaurantRepeatCount
            rng.uniform(0.5, 2.5, n),     # deliveryToComplaintMinutes
            rng.choice([0, 1], n, p=[0.75, 0.25]),  # hasQRSeal
            rng.integers(4, 10, n),       # sharedIPCount
            rng.choice([0, 1], n, p=[0.1, 0.9]),    # vpnDetected
        ])

    def review_sample(n):
        return np.column_stack([
            rng.uniform(30, 65, n),
            rng.choice([0, 1], n, p=[0.7, 0.3]),
            rng.uniform(50, 200, n),
            rng.uniform(50, 130, n),
            rng.uniform(25, 60, n),
            rng.integers(2, 5, n),
            rng.integers(1, 3, n),
            rng.integers(1, 3, n),
            rng.uniform(3, 15, n),
            rng.choice([0, 1], n, p=[0.5, 0.5]),
            rng.integers(1, 4, n),
            rng.choice([0, 1], n, p=[0.55, 0.45]),
        ])

    def legit_sample(n):
        return np.column_stack([
            rng.uniform(0, 28, n),
            rng.choice([0, 1], n, p=[0.97, 0.03]),
            rng.uniform(300, 1800, n),
            rng.uniform(20, 65, n),
            rng.uniform(0, 22, n),
            rng.integers(0, 2, n),
            rng.integers(0, 1, n),
            rng.integers(0, 1, n),
            rng.uniform(20, 90, n),
            rng.choice([0, 1], n, p=[0.08, 0.92]),
            rng.integers(0, 2, n),
            rng.choice([0, 1], n, p=[0.93, 0.07]),
        ])

    X_fraud  = fraud_sample(120).astype(float)
    X_review = review_sample(90).astype(float)
    X_legit  = legit_sample(90).astype(float)

    X = np.vstack([X_fraud, X_review, X_legit])
    # Labels: 1 = FRAUD, 0 = NOT FRAUD (REVIEW/LEGIT)
    y = np.array([1]*120 + [0]*90 + [0]*90)
    # Triclass labels for detailed output
    y3 = np.array([2]*120 + [1]*90 + [0]*90)  # 2=FRAUD, 1=REVIEW, 0=LEGIT
    return X, y, y3


FEATURE_NAMES = [
    "photoManipulationScore", "photoIsAIGenerated",
    "timeToComplaintSeconds", "typingSpeedWPM", "navigationAnomalyScore",
    "claimCount30Days", "priorDenials", "restaurantRepeatCount",
    "deliveryToComplaintMinutes", "hasQRSeal",
    "sharedIPCount", "vpnDetected",
]

X_train, y_bin, y3_train = _generate_training_data()

# --- Binary GBT (fraud vs not-fraud) ---
gbt_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.85,
        random_state=42,
    )),
])
gbt_pipeline.fit(X_train, y_bin)

# --- IsolationForest for anomaly/novelty score ---
iso_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("iso", IsolationForest(
        n_estimators=200,
        contamination=0.38,
        random_state=42,
    )),
])
iso_pipeline.fit(X_train)

# Feature importances from the classifier
raw_importances = gbt_pipeline.named_steps["clf"].feature_importances_
FEATURE_IMPORTANCES = {
    name: round(float(imp), 4)
    for name, imp in zip(FEATURE_NAMES, raw_importances)
}


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class SignalInput(BaseModel):
    photoManipulationScore: float = 0
    photoIsAIGenerated: bool = False
    timeToComplaintSeconds: float = 300
    typingSpeedWPM: float = 40
    navigationAnomalyScore: float = 0
    claimCount30Days: int = 0
    priorDenials: int = 0
    restaurantRepeatCount: int = 0
    deliveryToComplaintMinutes: float = 30
    hasQRSeal: bool = True
    sharedIPCount: int = 0
    vpnDetected: bool = False


def _to_feature_vector(s: SignalInput) -> np.ndarray:
    return np.array([[
        s.photoManipulationScore,
        float(s.photoIsAIGenerated),
        s.timeToComplaintSeconds,
        s.typingSpeedWPM,
        s.navigationAnomalyScore,
        s.claimCount30Days,
        s.priorDenials,
        s.restaurantRepeatCount,
        s.deliveryToComplaintMinutes,
        float(s.hasQRSeal),
        s.sharedIPCount,
        float(s.vpnDetected),
    ]])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model": "GradientBoosting+IsolationForest", "version": "2.0.0"}


@app.post("/predict")
def predict(signals: SignalInput):
    X = _to_feature_vector(signals)

    # GBT fraud probability
    fraud_proba = float(gbt_pipeline.predict_proba(X)[0][1])

    # IsolationForest anomaly score: -1 = anomaly, 1 = normal
    # score_samples returns lower = more anomalous
    raw_anomaly = float(iso_pipeline.named_steps["iso"].score_samples(
        iso_pipeline.named_steps["scaler"].transform(X)
    )[0])
    # Normalise to 0-100 (higher = more anomalous)
    anomaly_score = round(max(0.0, min(100.0, (raw_anomaly + 0.7) * -80)), 1)

    # Model confidence: how far the probability is from 0.5
    confidence = round(abs(fraud_proba - 0.5) * 2, 3)

    # Compute per-feature risk contributions (SHAP-lite: feature value × importance)
    X_flat = X[0]
    total_weight = sum(raw_importances)
    risk_contributions = {}
    for name, val, imp in zip(FEATURE_NAMES, X_flat, raw_importances):
        # Normalise feature to 0-1 range based on domain knowledge
        normalised = min(1.0, val / 100.0) if name not in [
            "photoIsAIGenerated", "hasQRSeal", "vpnDetected"
        ] else val
        risk_contributions[name] = round(float(normalised * imp / total_weight), 4)

    # Verdict from ML alone
    if fraud_proba >= 0.60:
        ml_verdict = "FRAUD"
    elif fraud_proba >= 0.35:
        ml_verdict = "REVIEW"
    else:
        ml_verdict = "LEGITIMATE"

    return {
        "ml_fraud_probability": round(fraud_proba, 4),
        "anomaly_score": anomaly_score,
        "ml_verdict": ml_verdict,
        "model_confidence": confidence,
        "feature_importances": FEATURE_IMPORTANCES,
        "risk_contributions": risk_contributions,
    }


@app.get("/feature-importances")
def feature_importances():
    return {
        "features": FEATURE_IMPORTANCES,
        "model": "GradientBoostingClassifier",
        "n_estimators": 150,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="warning")
