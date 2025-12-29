from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core import security
from app.core.config import settings
from app.api import deps
from app.schemas.user import Token, UserCreate, UserResponse, UserInDB
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
from app.services.email_service import email_service, generate_otp
from app.schemas.user import Token, UserCreate, UserResponse, UserInDB, OTPVerify, UserPlan

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncIOMotorDatabase = Depends(get_database),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user["is_active"]:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Auto-verify existing unverified users for seamless rollout
    if not user.get("email_verified", False):
        await db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"email_verified": True}}
        )
        user["email_verified"] = True
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    user_role = user.get("role", "user")
    return {
        "access_token": security.create_access_token(
            user["_id"], role=user_role, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": user_role
    }

@router.post("/register", response_model=UserResponse)
async def register_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_in: UserCreate
) -> Any:
    user = await db["users"].find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user_dict = user_in.dict()
    password = user_dict.pop("password")
    user_dict["hashed_password"] = security.get_password_hash(password)
    user_dict["_id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["status"] = "active"
    user_dict["email_verified"] = True  # Auto-verified for early rollout
    user_dict["otp_hash"] = None
    user_dict["otp_expires_at"] = None
    
    # Keep original logic commented for future re-enablement
    """
    otp = None
    if user_dict.get("role") == "user":
        otp = generate_otp()
        user_dict["otp_hash"] = security.get_password_hash(otp)
        user_dict["otp_expires_at"] = datetime.utcnow() + timedelta(minutes=10)
    else:
        user_dict["email_verified"] = True
        user_dict["otp_hash"] = None
        user_dict["otp_expires_at"] = None
    """
    otp = None
    
    # Initialize features and plan specific fields
    if user_dict.get("plan") == "paid":
        user_dict["is_paid"] = True
        user_dict["features"] = {
            "exam_mode": True,
            "text_highlight": True,
            "duration_limit": 10
        }
        user_dict["trial_expires_at"] = None
    else:
        user_dict["is_paid"] = False
        user_dict["features"] = {
            "exam_mode": False,
            "text_highlight": False,
            "duration_limit": 3
        }
        user_dict["trial_expires_at"] = datetime.utcnow() + timedelta(days=7)
    
    await db["users"].insert_one(user_dict)
    
    # Send Welcome Email only (OTP disabled)
    await email_service.send_welcome_email(user_in.email, name=user_in.full_name or "Student")
    
    """
    # Send OTP Email (Only for USER role)
    if otp:
        await email_service.send_otp_email(user_in.email, otp, first_name=user_in.full_name or "Student")
    elif user_dict.get("role") == "admin":
        await email_service.send_welcome_email(user_in.email, name=user_in.full_name or "Administrator")
    """
    
    return {**user_dict, "id": user_dict["_id"]}

@router.post("/verify-otp")
async def verify_otp(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    verify_in: OTPVerify
) -> Any:
    user = await db["users"].find_one({"email": verify_in.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}

    otp_expires_at = user.get("otp_expires_at")
    if not otp_expires_at or datetime.utcnow() > otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")

    if not security.verify_password(verify_in.otp, user.get("otp_hash", "")):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    await db["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {"email_verified": True},
            "$unset": {"otp_hash": "", "otp_expires_at": ""}
        }
    )
    
    await email_service.send_welcome_email(verify_in.email, name=user.get("full_name") or "Student")
    return {"message": "Email verified successfully"}

@router.post("/resend-otp")
async def resend_otp(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    email: str
) -> Any:
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    if user.get("role") == "admin":
        return {"message": "Admin accounts do not require email verification"}

    otp = generate_otp()
    await db["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "otp_hash": security.get_password_hash(otp),
                "otp_expires_at": datetime.utcnow() + timedelta(minutes=10)
            }
        }
    )
    
    # Send OTP Email
    await email_service.send_otp_email(email, otp, first_name=user.get("full_name") or "Student")
    return {"message": "OTP resent successfully"}

@router.post("/upgrade", response_model=UserResponse)
async def upgrade_to_premium(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(deps.get_current_active_user)
) -> Any:
    premium_features = {
        "exam_mode": True,
        "text_highlight": True,
        "duration_limit": 10
    }
    
    await db["users"].update_one(
        {"_id": current_user.id},
        {
            "$set": {
                "plan": UserPlan.PREMIUM,
                "is_paid": True,
                "features": premium_features,
                "trial_expires_at": None
            }
        }
    )
    
    # Return updated user info
    user = await db["users"].find_one({"_id": current_user.id})
    return {**user, "id": user["_id"]}


@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: UserInDB = Depends(deps.get_current_active_user),
) -> Any:
    # Reset daily count in response if it's a new day
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    daily_generations = current_user.daily_generations
    if not current_user.last_generation_date or current_user.last_generation_date < today:
        daily_generations = 0
        
    return {
        **current_user.dict(), 
        "id": current_user.id,
        "daily_generations": daily_generations
    }
