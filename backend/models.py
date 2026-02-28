from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User Models
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    password_hash: str
    account_number: str
    balance: float = 50000.0
    status: str = "ACTIVE" # ACTIVE | HOLD
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    account_number: str
    balance: float
    status: str
    created_at: datetime

# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[EmailStr] = None
    password: str

# Transaction Models
class TransactionBase(BaseModel):
    receiver_account: str
    amount: float
    transaction_type: int # 1:Transfer, 2:Cash Out, etc.

class TransactionCreate(TransactionBase):
    pass

class TransactionInDB(TransactionBase):
    user_id: str
    risk_score: float
    decision: str
    status: str # SUCCESS | BLOCKED | PENDING
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Fraud Log Models
class FraudLog(BaseModel):
    user_id: str
    risk_score: float
    reason: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Admin Models
class AdminInDB(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    password_hash: str
    role: str = "ADMIN"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminLog(BaseModel):
    admin_id: str
    action: str
    target_user: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
