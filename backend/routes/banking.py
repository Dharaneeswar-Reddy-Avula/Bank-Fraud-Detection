import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import TransactionCreate
from database import users_collection, transactions_collection
from services.ml import ensemble_predict_proba, explain_transaction
from twilio.rest import Client

router = APIRouter()

async def select_demo_user():
    user = await users_collection.find_one({"status": "ACTIVE"})
    if not user:
        raise HTTPException(400, "No active user found")
    return user

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None

def send_whatsapp_alert(phone, name, msg=None):
    if not msg:
        msg = f"⚠ Fraud Alert for {name}. Account on HOLD."
    if not twilio_client:
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
    except Exception:
        return False

@router.post("/transaction/send")
async def send_money(tx: TransactionCreate):
    user = await select_demo_user()
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
    from services.ml import threshold
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
        return {"status": "BLOCKED", "risk_score": float(prob)}
    new_balance = user["balance"] - tx.amount
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"balance": new_balance}}
    )
    reasons = explain_transaction(df)
    await transactions_collection.insert_one({
        "user_id": str(user["_id"]),
        "receiver_account": tx.receiver_account,
        "amount": tx.amount,
        "transaction_type": tx.transaction_type,
        "risk_score": float(prob),
        "decision": decision,
        "status": "SUCCESS",
        "explanation": reasons,
        "model": "Ensemble AI v1",
        "timestamp": datetime.utcnow()
    })
    return {
        "status": "SUCCESS",
        "risk_score": float(prob),
        "decision": decision,
        "new_balance": new_balance,
        "explanation": reasons
    }

@router.get("/admin/stats")
async def admin_stats():
    total_users = await users_collection.count_documents({})
    active = await users_collection.count_documents({"status": "ACTIVE"})
    hold = await users_collection.count_documents({"status": "HOLD"})
    total_tx = await transactions_collection.count_documents({})
    fraud_tx = await transactions_collection.count_documents({"decision": "BLOCK"})
    return {
        "total_users": total_users,
        "active_accounts": active,
        "hold_accounts": hold,
        "total_transactions": total_tx,
        "fraud_transactions": fraud_tx
    }

@router.get("/user/me")
async def read_users_me():
    user = await select_demo_user()
    user["_id"] = str(user["_id"])
    return user

@router.get("/transactions/history")
async def get_history():
    user = await select_demo_user()
    cursor = transactions_collection.find({"user_id": str(user["_id"])}).sort("timestamp", -1)
    history = await cursor.to_list(length=100)
    for tx in history:
        tx["_id"] = str(tx["_id"])
    return history
