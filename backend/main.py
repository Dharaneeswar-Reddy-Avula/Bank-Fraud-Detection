import os
import random
import string
import warnings
from datetime import datetime

import joblib
import pandas as pd
import shap
import numpy as np
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, status, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from jose import jwt
from bson import ObjectId

from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token
)

from database import (
    users_collection,
    transactions_collection,
    fraud_logs_collection,
    admins_collection,
    admin_logs_collection
)

from models import (
    UserCreate,
    UserResponse,
    Token,
    TransactionCreate
)

from twilio.rest import Client

load_dotenv()
warnings.filterwarnings("ignore")

app = FastAPI(title="FraudShield AI Banking System")

# ============================
# 🔥 CORS FIX (DEPLOY SAFE)
# ============================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",   # keep for hackathon, remove later if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Preflight handler (CRITICAL for Render)
@app.options("/{full_path:path}")
async def preflight_handler():
    return {"status": "ok"}

# ============================
# Twilio Config
# ============================

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv(
    "TWILIO_WHATSAPP_FROM",
    "whatsapp:+14155238886"
)

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print("✅ Twilio Ready")
    except Exception as e:
        print("❌ Twilio Error:", e)

# ============================
# Health Routes
# ============================

@app.get("/")
async def root():
    return {"status": "FraudShield Running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ============================
# Model Load
# ============================

try:
    package = joblib.load("ensemble_model.pkl")

    knn = package["knn"]
    rf = package["rf"]
    xgb = package["xgb"]
    columns = package["columns"]
    threshold = package["threshold"]

    print("✅ Model Loaded")

except Exception as e:
    print("❌ Model Load Error:", e)

    columns = ["Source", "Target", "Weight", "typeTrans"]
    threshold = 0.3

background = pd.DataFrame(
    np.zeros((1, len(columns))),
    columns=columns
)

explainer = shap.KernelExplainer(
    lambda x: xgb.predict_proba(
        pd.DataFrame(x, columns=columns)
    )[:, 1],
    background
)

feature_map = {
    "Weight": "Transaction amount unusually high",
    "Source": "Sender behavior suspicious",
    "Target": "Receiver risky",
    "typeTrans": "Transaction type risky"
}

# ============================
# Auth Middleware
# ============================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):

    payload = decode_token(token)

    if payload is None:
        raise HTTPException(status_code=401)

    email = payload.get("sub")

    user = await users_collection.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=401)

    return user


async def get_current_admin(token: str = Depends(oauth2_scheme)):

    payload = decode_token(token)

    if payload is None or payload.get("role") != "ADMIN":
        raise HTTPException(status_code=401)

    email = payload.get("sub")

    admin = await admins_collection.find_one({"email": email})

    if not admin:
        raise HTTPException(status_code=401)

    return admin

# ============================
# Helpers
# ============================


def generate_account_number():
    return "".join(random.choices(string.digits, k=10))


def send_whatsapp_alert(phone, name, msg=None):

    if not msg:
        msg = f"⚠ Fraud Alert for {name}. Account on HOLD."

    if not twilio_client:
        print("Mock WhatsApp:", msg)
        return True

    phone = "".join(filter(str.isdigit, phone))

    if len(phone) == 10:
        phone = "91" + phone

    try:
        twilio_client.messages.create(
            body=msg,
            from_=TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:+{phone}"
        )
        return True
    except Exception as e:
        print("Twilio error:", e)
        return False


def ensemble_predict_proba(features):

    df = pd.DataFrame([features])
    df = df.reindex(columns=columns, fill_value=0)

    p1 = knn.predict_proba(df)[0][1]
    p2 = rf.predict_proba(df)[0][1]
    p3 = xgb.predict_proba(df)[0][1]

    prob = (p1 + 2*p2 + 3*p3) / 6

    return prob, df


def explain_transaction(df):

    shap_values = explainer.shap_values(df)[0]

    idx = np.argsort(np.abs(shap_values))[::-1][:3]

    reasons = []

    for i in idx:
        if abs(shap_values[i]) > 0.01:
            reasons.append(
                feature_map.get(columns[i], "Risk detected")
            )

    return reasons or ["High risk profile"]

# ============================
# AUTH APIs
# ============================


@app.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):

    if await users_collection.find_one({"email": user_data.email}):
        raise HTTPException(400, "Email exists")

    acc = generate_account_number()

    data = user_data.dict()

    password = data.pop("password")

    user = {
        **data,
        "password_hash": get_password_hash(password),
        "account_number": acc,
        "balance": 50000,
        "status": "ACTIVE",
        "created_at": datetime.utcnow()
    }

    res = await users_collection.insert_one(user)

    user["_id"] = str(res.inserted_id)

    return user


@app.post("/auth/login", response_model=Token)
async def login(request: Request):

    body = await request.json()

    email = body.get("email")
    password = body.get("password")

    user = await users_collection.find_one({"email": email})

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({"sub": email, "role": "USER"})

    return {"access_token": token, "token_type": "bearer"}

# ============================
# TRANSACTION
# ============================


@app.post("/transaction/send")
async def send_money(
    tx: TransactionCreate,
    user=Depends(get_current_user)
):

    if user["status"] == "HOLD":
        raise HTTPException(403, "Account on HOLD")

    if user["balance"] < tx.amount:
        raise HTTPException(400, "Insufficient balance")

    features = {
        "Source": float(user["account_number"]),
        "Target": float(tx.receiver_account),
        "Weight": float(tx.amount),
        "typeTrans": float(tx.transaction_type)
    }

    prob, df = ensemble_predict_proba(features)

    decision = "APPROVE"

    if prob > 0.7:
        decision = "BLOCK"
    elif prob > threshold:
        decision = "OTP"

    if decision == "BLOCK":

        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"status": "HOLD"}}
        )

        send_whatsapp_alert(user["phone"], user["name"])

        return {
            "status": "BLOCKED",
            "risk_score": float(prob)
        }

    new_balance = user["balance"] - tx.amount

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"balance": new_balance}}
    )

    reasons = explain_transaction(df)

    return {
        "status": "SUCCESS",
        "risk_score": float(prob),
        "decision": decision,
        "new_balance": new_balance,
        "explanation": reasons
    }

# ============================
# ADMIN
# ============================


@app.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):

    total_users = await users_collection.count_documents({})
    active = await users_collection.count_documents({"status": "ACTIVE"})
    hold = await users_collection.count_documents({"status": "HOLD"})

    total_tx = await transactions_collection.count_documents({})

    fraud_tx = await transactions_collection.count_documents(
        {"decision": "BLOCK"}
    )

    return {
        "total_users": total_users,
        "active_accounts": active,
        "hold_accounts": hold,
        "total_transactions": total_tx,
        "fraud_transactions": fraud_tx
    }

# ============================
# MAIN
# ============================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)