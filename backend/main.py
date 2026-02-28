import os
import random
import string
import warnings
from datetime import datetime
from typing import List, Optional

import joblib
import pandas as pd
import shap
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

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
    TransactionCreate,
    TransactionInDB,
    FraudLog,
    AdminLog
)
from bson import ObjectId

from twilio.rest import Client

load_dotenv()
warnings.filterwarnings("ignore")

app = FastAPI(title="FraudShield AI Banking System")

# ======================
# Twilio Configuration (WhatsApp Sandbox)
# ======================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886").strip()

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print(f"✅ Twilio WhatsApp Client initialized (SID: {TWILIO_ACCOUNT_SID[:5]}...)")
    except Exception as e:
        print(f"❌ Twilio initialization failed: {e}")
else:
    print("⚠️ Twilio credentials missing in .env - WhatsApp alerts will be MOCKED")

# ======================
# CORS
# ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://bank-fraud-detection-vjvm.vercel.app", "https://bank-fraud-detection-iota.vercel.app", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# Load Model Logic (Original)
# ======================
try:
    package = joblib.load("ensemble_model.pkl")
    knn = package["knn"]
    rf = package["rf"]
    xgb = package["xgb"]
    columns = package["columns"]
    threshold = package["threshold"]
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    # Fallback columns if model load fails
    columns = ["Source", "Target", "Weight", "typeTrans"]
    threshold = 0.3

# SHAP EXPLAINER
background = pd.DataFrame(np.zeros((1, len(columns))), columns=columns)
explainer = shap.KernelExplainer(
    lambda x: xgb.predict_proba(pd.DataFrame(x, columns=columns))[:, 1],
    background
)

feature_map = {
    "Weight": "Transaction amount is unusually high",
    "Source": "Sender account behavior looks unusual",
    "Target": "Receiver account appears suspicious",
    "typeTrans": "Transaction type has elevated fraud risk"
}

@app.on_event("startup")
async def startup_db_client():
    try:
        from database import client, DB_NAME
        # The ping command is cheap and does not require auth.
        await client[DB_NAME].command("ping")
        print("✅ MongoDB connection verified")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

# ======================
# Auth Middleware
# ======================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = await users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    role: str = payload.get("role")
    if email is None or role != "ADMIN":
        raise credentials_exception
    admin = await admins_collection.find_one({"email": email})
    if admin is None:
        raise credentials_exception
    return admin

# ======================
# Helper Functions
# ======================
def generate_account_number():
    return ''.join(random.choices(string.digits, k=10))

def send_whatsapp_alert(phone: str, name: str, custom_message: str = None):
    # Ensure recipient phone is in E.164 format and prefixed with whatsapp:
    clean_phone = ''.join(filter(str.isdigit, phone))
    if len(clean_phone) == 10:
        clean_phone = f"91{clean_phone}" # Assume India if 10 digits
    
    whatsapp_to = f"whatsapp:+{clean_phone}"
    whatsapp_from = TWILIO_WHATSAPP_FROM
            
    if custom_message:
        message = custom_message
    else:
        message = f"⚠ *FraudShield AI Alert*\n\nSuspicious transaction detected on your account, *{name}*. Your account has been temporarily placed on *HOLD* for your security.\n\nPlease contact our security desk immediately to verify your identity and restore access."
    
    print(f"📱 [WHATSAPP LOG from {whatsapp_from} to {whatsapp_to}]")
    
    if twilio_client and whatsapp_from:
        try:
            twilio_client.messages.create(
                body=message,
                from_=whatsapp_from,
                to=whatsapp_to
            )
            print(f"✅ WhatsApp alert sent successfully to {whatsapp_to}")
            return True
        except Exception as e:
            print(f"❌ WhatsApp failed: {e}")
            return False
    else:
        if not twilio_client:
            print("⚠️ WhatsApp SKIPPED: Twilio client not initialized")
        if not whatsapp_from:
            print("⚠️ WhatsApp SKIPPED: TWILIO_WHATSAPP_FROM missing")
    return True
    
def ensemble_predict_proba(features: dict):
    df = pd.DataFrame([features])
    df = df.reindex(columns=columns, fill_value=0)
    p1 = knn.predict_proba(df)[0][1]
    p2 = rf.predict_proba(df)[0][1]
    p3 = xgb.predict_proba(df)[0][1]
    prob = (p1*1 + p2*2 + p3*3) / 6
    return prob, df

def explain_transaction(df):
    shap_values = explainer.shap_values(df)
    vals = shap_values[0]
    top_indices = np.argsort(np.abs(vals))[::-1][:3]
    reasons = [feature_map.get(columns[i], "Anomalous pattern detected") for i in top_indices if abs(vals[i]) > 0.01]
    return reasons if reasons else ["High risk transaction profile"]

# ======================
# Authentication APIs
# ======================
@app.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    account_number = generate_account_number()
    user_dict = user_data.dict()
    password = user_dict.pop("password")
    
    new_user = {
        **user_dict,
        "password_hash": get_password_hash(password),
        "account_number": account_number,
        "balance": 50000.0,
        "status": "ACTIVE",
        "created_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(new_user)
    new_user["_id"] = str(result.inserted_id)
    return new_user

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"], "role": "USER"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/admin/login", response_model=Token)
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    admin = await admins_collection.find_one({"email": form_data.username})
    # If no admin exists, create a default one for first-time setup
    if await admins_collection.count_documents({}) == 0 and form_data.username == "admin@fraudshield.ai":
        default_admin = {
            "email": "admin@fraudshield.ai",
            "password_hash": get_password_hash("admin123"),
            "role": "ADMIN",
            "created_at": datetime.utcnow()
        }
        await admins_collection.insert_one(default_admin)
        admin = default_admin

    if not admin or not verify_password(form_data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": admin["email"], "role": "ADMIN"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/user/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    current_user["_id"] = str(current_user["_id"])
    return current_user

# ======================
# Banking APIs
# ======================
@app.post("/transaction/send")
async def send_money(
    tx_data: TransactionCreate, 
    current_user: dict = Depends(get_current_user)
):
    # Step 1: Check account status
    if current_user["status"] == "HOLD":
        raise HTTPException(status_code=403, detail="Account on hold due to suspicious activity")
    
    if current_user["balance"] < tx_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Step 2: Fraud Detection
    # Prepare features for model
    features = {
        "Source": float(current_user["account_number"]),
        "Target": float(tx_data.receiver_account),
        "Weight": float(tx_data.amount),
        "typeTrans": float(tx_data.transaction_type)
    }
    
    prob, df = ensemble_predict_proba(features)
    
    # Decision logic
    decision = "APPROVE"
    if prob > 0.7:
        decision = "BLOCK"
    elif prob > threshold:
        decision = "OTP_VERIFICATION"

    # Step 4: Apply logic
    if decision == "APPROVE" or decision == "OTP_VERIFICATION":
        # OTP Simulation (always success as requested)
        if decision == "OTP_VERIFICATION":
            print(f"🔑 [OTP SIMULATION]: OTP verified successfully for transaction to {tx_data.receiver_account}")

        # Process Transaction
        new_balance = current_user["balance"] - tx_data.amount
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"balance": new_balance}}
        )
        
        reasons = explain_transaction(df)
        tx_in_db = {
            "user_id": str(current_user["_id"]),
            "receiver_account": tx_data.receiver_account,
            "amount": tx_data.amount,
            "transaction_type": tx_data.transaction_type,
            "risk_score": float(prob),
            "decision": decision,
            "status": "SUCCESS",
            "explanation": reasons,
            "model": "Ensemble AI v1",
            "timestamp": datetime.utcnow()
        }
        await transactions_collection.insert_one(tx_in_db)
        
        return {
            "status": "SUCCESS",
            "decision": decision,
            "risk_score": float(prob),
            "explanation": reasons,
            "model": "Ensemble AI v1",
            "new_balance": new_balance
        }

    elif decision == "BLOCK":
        # Freeze account
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"status": "HOLD"}}
        )
        
        # Save fraud log
        reasons = explain_transaction(df)
        fraud_log = {
            "user_id": str(current_user["_id"]),
            "risk_score": float(prob),
            "reason": reasons,
            "timestamp": datetime.utcnow()
        }
        await fraud_logs_collection.insert_one(fraud_log)
        
        # Save blocked transaction
        tx_in_db = {
            "user_id": str(current_user["_id"]),
            "receiver_account": tx_data.receiver_account,
            "amount": tx_data.amount,
            "transaction_type": tx_data.transaction_type,
            "risk_score": float(prob),
            "decision": decision,
            "status": "BLOCKED",
            "explanation": reasons,
            "model": "Ensemble AI v1",
            "timestamp": datetime.utcnow()
        }
        await transactions_collection.insert_one(tx_in_db)
        
        # Send WhatsApp alert
        send_whatsapp_alert(current_user["phone"], current_user["name"])
        
        return {
            "status": "BLOCKED",
            "decision": "BLOCK",
            "risk_score": float(prob),
            "explanation": reasons,
            "model": "Ensemble AI v1",
            "message": "Transaction blocked and account placed on hold."
        }

@app.get("/transactions/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    cursor = transactions_collection.find({"user_id": str(current_user["_id"])}).sort("timestamp", -1)
    history = await cursor.to_list(length=100)
    for tx in history:
        tx["_id"] = str(tx["_id"])
    return history

# ======================
# Admin APIs
# ======================
@app.get("/admin/stats")
async def admin_get_stats(current_admin: dict = Depends(get_current_admin)):
    total_users = await users_collection.count_documents({})
    active_accounts = await users_collection.count_documents({"status": "ACTIVE"})
    hold_accounts = await users_collection.count_documents({"status": "HOLD"})
    blocked_accounts = await users_collection.count_documents({"status": "BLOCKED"})
    
    total_transactions = await transactions_collection.count_documents({})
    fraud_transactions = await transactions_collection.count_documents({"decision": "BLOCK"})
    
    # Money transferred (Approved only)
    pipeline = [
        {"$match": {"status": "SUCCESS"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    money_res = await transactions_collection.aggregate(pipeline).to_list(1)
    total_money = money_res[0]["total"] if money_res else 0
    
    # Today's transactions
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_transactions = await transactions_collection.count_documents({"timestamp": {"$gte": today_start}})
    
    fraud_rate = (fraud_transactions / total_transactions * 100) if total_transactions > 0 else 0
    
    return {
        "total_users": total_users,
        "active_accounts": active_accounts,
        "hold_accounts": hold_accounts,
        "blocked_accounts": blocked_accounts,
        "total_transactions": total_transactions,
        "fraud_transactions": fraud_transactions,
        "today_transactions": today_transactions,
        "total_money": total_money,
        "fraud_rate": round(fraud_rate, 2)
    }

@app.get("/admin/users")
async def admin_get_users(current_admin: dict = Depends(get_current_admin)):
    cursor = users_collection.find({})
    users = await cursor.to_list(length=100)
    for u in users:
        u["_id"] = str(u["_id"])
        u.pop("password_hash", None)
    return users

@app.get("/admin/transactions")
async def admin_get_all_transactions(current_admin: dict = Depends(get_current_admin)):
    cursor = transactions_collection.find({}).sort("timestamp", -1)
    txs = await cursor.to_list(length=200)
    for tx in txs:
        tx["_id"] = str(tx["_id"])
    return txs

@app.get("/admin/fraud-logs")
async def admin_get_fraud_logs(current_admin: dict = Depends(get_current_admin)):
    cursor = fraud_logs_collection.find({}).sort("timestamp", -1)
    logs = await cursor.to_list(length=100)
    for l in logs:
        l["_id"] = str(l["_id"])
    return logs

@app.post("/admin/unhold/{user_id}")
async def admin_unhold_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "ACTIVE"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="User already active")
    
    # Log action
    await admin_logs_collection.insert_one({
        "admin_id": str(current_admin["_id"]),
        "action": "UNHOLD",
        "target_user": user_id,
        "timestamp": datetime.utcnow()
    })

    # Notify User via WhatsApp
    msg = f"✅ *FraudShield AI Notification*\n\nYour account status has been restored to *ACTIVE* by our security team. You can now resume your transactions.\n\nThank you for your cooperation."
    send_whatsapp_alert(user["phone"], user["name"], msg)

    return {"message": "Account unheld successfully"}

@app.post("/admin/block/{user_id}")
async def admin_block_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "BLOCKED"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="User already blocked")
    
    # Log action
    await admin_logs_collection.insert_one({
        "admin_id": str(current_admin["_id"]),
        "action": "BLOCK",
        "target_user": user_id,
        "timestamp": datetime.utcnow()
    })

    # Notify User via WhatsApp
    msg = f"🚫 *FraudShield AI Security Alert*\n\nYour account has been *PERMANENTLY BLOCKED* due to severe policy violations or confirmed fraudulent activity.\n\nPlease visit your nearest branch for further information."
    send_whatsapp_alert(user["phone"], user["name"], msg)

    return {"message": "Account blocked successfully"}

@app.post("/admin/unblock/{user_id}")
async def admin_unblock_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "ACTIVE"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="User already active")
    
    # Log action
    await admin_logs_collection.insert_one({
        "admin_id": str(current_admin["_id"]),
        "action": "UNBLOCK",
        "target_user": user_id,
        "timestamp": datetime.utcnow()
    })

    # Notify User via WhatsApp
    msg = f"✅ *FraudShield AI Notification*\n\nYour account has been *UNBLOCKED* and restored to *ACTIVE* status. Access to all banking services is now available."
    send_whatsapp_alert(user["phone"], user["name"], msg)

    return {"message": "Account unblocked successfully"}

# Original /predict endpoint for backward compatibility
@app.post("/predict")
async def predict_legacy(
    Source: float = Body(...),
    Target: float = Body(...),
    Weight: float = Body(...),
    typeTrans: float = Body(...)
):
    features = {
        "Source": Source,
        "Target": Target,
        "Weight": Weight,
        "typeTrans": typeTrans
    }
    prob, df = ensemble_predict_proba(features)
    reasons = explain_transaction(df)
    
    decision = "APPROVE"
    if prob > 0.7: decision = "BLOCK"
    elif prob > threshold: decision = "OTP_VERIFICATION"
    
    return {
        "risk_score": float(prob),
        "decision": decision,
        "model": "Ensemble AI v1",
        "explanation": reasons
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
