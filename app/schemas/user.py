from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class UserPlan(str, Enum):
    TRIAL = "trial"
    PAID = "paid"
    PREMIUM = "premium"

class UserFeatures(BaseModel):
    exam_mode: bool = False
    text_highlight: bool = False
    duration_limit: int = 3  # 3, 5, 10 minutes

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    role: UserRole = UserRole.USER
    plan: UserPlan = UserPlan.TRIAL
    trial_expires_at: Optional[datetime] = None
    is_paid: bool = False
    features: UserFeatures = UserFeatures()
    status: str = "active"
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    plan: Optional[UserPlan] = None
    trial_expires_at: Optional[datetime] = None
    is_paid: Optional[bool] = None
    features: Optional[UserFeatures] = None
    status: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(..., alias="_id")
    hashed_password: str
    daily_generations: int = 0
    last_generation_date: Optional[datetime] = None
    otp_hash: Optional[str] = None
    otp_expires_at: Optional[datetime] = None

class UserResponse(UserBase):
    id: str
    daily_generations: int = 0
    last_generation_date: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
