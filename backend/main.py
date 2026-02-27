from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import warnings

warnings.filterwarnings("ignore")

app = FastAPI(title="Real-Time Fraud Detection API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
try:
    package = joblib.load("ensemble_model.pkl")
    knn = package["knn"]
    rf = package["rf"]
    xgb = package["xgb"]
    columns = package["columns"]
    threshold = package["threshold"]
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    # Fallback to defaults only if load fails
    columns = ['Source', 'Target', 'Weight', 'typeTrans']
    threshold = 0.3

print("Model expects columns:", columns)
print("Threshold value:", threshold)

# ======================
# Input Schema (MATCH MODEL)
# ======================

class Transaction(BaseModel):
    Source: float
    Target: float
    Weight: float
    typeTrans: float


# ======================
# Ensemble Prediction
# ======================

def ensemble_predict_proba(features: dict):
    df = pd.DataFrame([features])
    df = df[columns]

    p1 = knn.predict_proba(df)[0][1]
    p2 = rf.predict_proba(df)[0][1]
    p3 = xgb.predict_proba(df)[0][1]

    prob = (p1 * 1 + p2 * 2 + p3 * 3) / 6

    return prob


@app.get("/")
def home():
    return {"message": "Fraud Detection API Running 🚀"}


@app.post("/predict")
def predict(txn: Transaction):

    features = txn.dict()

    prob = ensemble_predict_proba(features)

    if prob > 0.7:
        decision = "BLOCK"
    elif prob > threshold:
        decision = "OTP_VERIFICATION"
    else:
        decision = "APPROVE"

    return {
        "risk_score": float(prob),
        "decision": decision,
        "model": "Ensemble AI v1"
    }