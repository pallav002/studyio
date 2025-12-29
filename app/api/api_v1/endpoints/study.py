from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.api import deps
from app.schemas.study import StudyPrompt, StudySessionResponse
from app.schemas.user import UserInDB, UserPlan
from app.services.study_service import study_service
from app.services.polly_service import polly_service
from app.schemas.admin import AppConfig
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
from datetime import datetime, timedelta
import io
from app.core.rate_limit import generation_limiter, audio_limiter
from app.core import security

router = APIRouter()

@router.get("/config", response_model=AppConfig)
async def get_public_config(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(deps.get_current_active_user),
) -> Any:
    config = await db["config"].find_one({"_id": "app_config"})
    if not config:
        return AppConfig()
    return config

@router.post("/generate", response_model=StudySessionResponse)
async def generate_study_session(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(deps.get_current_active_user),
    study_in: StudyPrompt,
    _ = Depends(generation_limiter)
) -> Any:
    # Fetch global admin config
    config = await db["config"].find_one({"_id": "app_config"})
    if not config:
        config = AppConfig().dict()

    # 1. Check Duration enablement and limits
    allowed_duration = current_user.features.duration_limit
    if study_in.duration_minutes > allowed_duration:
        raise HTTPException(status_code=403, detail=f"Duration limit exceeded. Your current limit is {allowed_duration} minutes. Please upgrade.")
    
    if str(study_in.duration_minutes) not in config.get("character_limits", {}):
        raise HTTPException(status_code=403, detail="Selected duration is currently disabled by Admin.")

    # 2. Check Exam Mode (Admin Toggle + Plan Access)
    if study_in.exam_mode:
        if not config.get("features_enabled", {}).get("exam_mode", True):
            raise HTTPException(status_code=403, detail="Exam Mode is currently disabled platform-wide.")
        if not current_user.features.exam_mode:
            raise HTTPException(status_code=403, detail="Exam Mode is a Premium feature. Please upgrade.")
    
    # 3. Check Text Highlighting (Admin Toggle + Plan Access)
    if study_in.text_highlighting:
        if not config.get("features_enabled", {}).get("text_highlighting", True):
            raise HTTPException(status_code=403, detail="Text Highlighting is currently disabled platform-wide.")
        if not current_user.features.text_highlight:
            raise HTTPException(status_code=403, detail="Text Highlighting is a Premium feature. Please upgrade.")


    # Check daily generation limit
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Reset daily count if it's a new day
    if not current_user.last_generation_date or current_user.last_generation_date < today:
        current_user.daily_generations = 0
    
    # Fetch daily limit from config
    config = await db["config"].find_one({"_id": "app_config"})
    daily_limit = 5
    if config:
        daily_limit = config.get("daily_generation_limit", 5)

    # Total Trial Sessions Limit
    total_trial_limit = 3
    if config:
        total_trial_limit = config.get("trial_limit_sessions", 3)
    
    if current_user.plan == UserPlan.TRIAL:
        total_sessions = await db["study_sessions"].count_documents({"user_id": current_user.id})
        if total_sessions >= total_trial_limit or current_user.daily_generations >= daily_limit:
            raise HTTPException(
                status_code=403,
                detail="TRIAL_LIMIT_EXCEEDED"
            )
    
    # 4. Redundant Generation Prevention (Optimization)
    # Generate content hash: topic + prompt + duration + exam_mode (Global for optimization)
    # We also keep a user-specific check for history
    import hashlib
    content_payload = f"{study_in.topic.lower()}:{study_in.prompt.strip().lower()}:{study_in.duration_minutes}:{study_in.exam_mode}"
    global_hash = hashlib.md5(content_payload.encode()).hexdigest()
    user_hash = hashlib.md5(f"{current_user.id}:{content_payload}".encode()).hexdigest()
    
    # First, check if user already has this in their history
    existing_user_session = await db["study_sessions"].find_one({"user_id": current_user.id, "user_hash": user_hash})
    if existing_user_session:
        return {
            "id": existing_user_session["_id"],
            "topic": existing_user_session["topic"],
            "prompt": existing_user_session.get("prompt", ""),
            "content": existing_user_session["content"],
            "duration_minutes": existing_user_session.get("duration_minutes", 3),
            "exam_mode": existing_user_session.get("exam_mode", False),
            "text_highlighting": existing_user_session.get("text_highlighting", False),
            "questions": existing_user_session.get("questions"),
            "audio_url": f"/api/v1/study/audio/{existing_user_session['_id']}?token={security.create_access_token(subject=existing_user_session['_id'], role='user', expires_delta=timedelta(hours=1))}" if not existing_user_session.get("exam_mode") else None,
            "listen_count": existing_user_session.get("listen_count", 0),
            "speech_marks": existing_user_session.get("speech_marks", []),
            "created_at": existing_user_session["created_at"]
        }

    # Second, check if ANY user has generated this (Optimization)
    reusable_session = await db["study_sessions"].find_one({"global_hash": global_hash})
    
    content = None
    audio_data = None
    speech_marks = []
    questions = None
    openai_usage = 0
    polly_usage = 0
    openai_cost = 0.0
    polly_cost = 0.0
    total_cost = 0.0

    if reusable_session:
        # Reuse content and audio
        content = reusable_session["content"]
        audio_data = reusable_session.get("audio_data")
        speech_marks = reusable_session.get("speech_marks", [])
        questions = reusable_session.get("questions")
        # Cost is 0 for reused content
    else:
        # Generate new content
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Starting content generation for topic={study_in.topic}, duration={study_in.duration_minutes}, exam_mode={study_in.exam_mode}")
            
            content, openai_usage = await study_service.generate_content(
                db=db,
                topic=study_in.topic,
                duration_minutes=study_in.duration_minutes,
                prompt=study_in.prompt,
                exam_mode=study_in.exam_mode,
                system_prompt_override=study_in.system_prompt
            )

            questions = None
            if study_in.exam_mode:
                import json
                try:
                    # Expecting {"questions": [...]} or just [...]
                    data = json.loads(content)
                    if isinstance(data, dict) and "questions" in data:
                        questions = data["questions"]
                    elif isinstance(data, list):
                        questions = data
                    else:
                        logger.warning(f"Unexpected JSON format for questions: {type(data)}")
                except Exception as e:
                    logger.error(f"Failed to parse MCQ JSON: {str(e)}")
                    # Fallback or error? Let's try to fix common GPT formatting issues
                    if "```json" in content:
                        try:
                            json_str = content.split("```json")[1].split("```")[0].strip()
                            data = json.loads(json_str)
                            questions = data.get("questions", data) if isinstance(data, dict) else data
                        except:
                            pass

            if not questions and study_in.exam_mode:
                logger.error("Failed to generate valid MCQ structure")
                raise HTTPException(status_code=500, detail="Failed to generate valid Exam questions. Please try again.")

            logger.info(f"Content generated successfully, length={len(content)}, tokens={openai_usage}")
            
            # Synthesize audio (ONLY if not exam mode)
            if not study_in.exam_mode:
                logger.info(f"Starting audio synthesis, content length={len(content)}")
                audio_data, speech_marks, polly_usage = await polly_service.text_to_speech(content)
                logger.info(f"Audio synthesized successfully, audio_size={len(audio_data)}, marks={len(speech_marks)}")
                
                # Calculate Costs
                openai_cost = (openai_usage / 1000) * 0.045
                polly_cost = (polly_usage / 1000000) * 16.00
                total_cost = openai_cost + polly_cost
            else:
                # Exam mode costs (only OpenAI)
                openai_cost = (openai_usage / 1000) * 0.045
                total_cost = openai_cost
            
        except HTTPException:
            raise
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    session_id = str(uuid.uuid4())
    
    session_dict = {
        "_id": session_id,
        "user_id": current_user.id,
        "global_hash": global_hash,
        "user_hash": user_hash,
        "topic": study_in.topic,
        "prompt": study_in.prompt,
        "content": content,
        "audio_data": audio_data,
        "speech_marks": speech_marks or [],
        "questions": questions,
        "duration_minutes": study_in.duration_minutes,
        "exam_mode": study_in.exam_mode,
        "text_highlighting": study_in.text_highlighting,
        "reused": True if reusable_session else False,
        "listen_count": 0,
        "created_at": now
    }
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Saving session to database, id={session_id}")
        
        await db["study_sessions"].insert_one(session_dict)
        logger.info(f"Session saved successfully")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Database save failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")
    
    # Update user usage
    try:
        # Correctly handle reset and increment in a single atomic-ish operation
        update_doc = {
            "$set": {"last_generation_date": now}
        }
        
        if not current_user.last_generation_date or current_user.last_generation_date < today:
            update_doc["$set"]["daily_generations"] = 1
        else:
            update_doc["$inc"] = {"daily_generations": 1}

        await db["users"].update_one(
            {"_id": current_user.id},
            update_doc
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to update user usage: {str(e)}")
    
    # Store usage and cost
    try:
        usage_dict = {
            "session_id": session_id,
            "user_id": current_user.id,
            "openai_tokens": openai_usage,
            "polly_characters": polly_usage,
            "openai_cost": openai_cost,
            "polly_cost": polly_cost,
            "total_cost": total_cost,
            "created_at": now
        }
        await db["usage"].insert_one(usage_dict)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to save usage data: {str(e)}")
    
    # Generate short-lived audio token
    audio_token = security.create_access_token(
        subject=session_id, role="user", expires_delta=timedelta(hours=1)
    )
    
    return {
        "id": session_id,
        "topic": study_in.topic,
        "prompt": study_in.prompt,
        "content": content,
        "duration_minutes": study_in.duration_minutes,
        "exam_mode": study_in.exam_mode,
        "text_highlighting": study_in.text_highlighting,
        "audio_url": f"/api/v1/study/audio/{session_id}?token={audio_token}" if not study_in.exam_mode else None,
        "listen_count": 0,
        "speech_marks": speech_marks or [],
        "questions": questions,
        "created_at": session_dict["created_at"]
    }

@router.get("/history", response_model=List[StudySessionResponse])
async def get_study_history(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(deps.get_current_active_user),
    date: str = None
) -> Any:
    query = {"user_id": current_user.id}
    if date:
        try:
            start_date = datetime.strptime(date, "%Y-%m-%d")
            end_date = start_date + timedelta(days=1)
            query["created_at"] = {"$gte": start_date, "$lt": end_date}
        except ValueError:
            pass

    cursor = db["study_sessions"].find(query, {"audio_data": 0}).sort("created_at", -1)
    sessions = await cursor.to_list(length=100)
    
    return [
        {
            "id": s["_id"],
            "topic": s["topic"],
            "prompt": s.get("prompt", ""),
            "content": s["content"],
            "duration_minutes": s.get("duration_minutes", 3),
            "exam_mode": s.get("exam_mode", False),
            "text_highlighting": s.get("text_highlighting", False),
            "audio_url": f"/api/v1/study/audio/{s['_id']}?token={security.create_access_token(subject=s['_id'], role='user', expires_delta=timedelta(hours=1))}" if not s.get("exam_mode") else None,
            "listen_count": s.get("listen_count", 0),
            "speech_marks": s.get("speech_marks", []),
            "questions": s.get("questions"),
            "created_at": s["created_at"]
        }
        for s in sessions
    ]

@router.api_route("/audio/{session_id}", methods=["GET", "HEAD"])
async def get_study_audio(
    session_id: str,
    token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _ = Depends(audio_limiter)
) -> Any:
    # Verify short-lived token
    try:
        from jose import jwt, JWTError
        from app.core.config import settings
        import logging
        logger = logging.getLogger(__name__)

        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("sub") != session_id:
            logger.error(f"Token subject mismatch: {payload.get('sub')} vs {session_id}")
            raise HTTPException(status_code=403, detail="Invalid audio token subject")
    except JWTError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"JWT Verification Error: {str(e)} for token: {token[:10]}...")
        raise HTTPException(status_code=403, detail=f"Invalid or expired audio token: {str(e)}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected Audio Token Error: {str(e)}")
        raise HTTPException(status_code=403, detail="Invalid audio token system error")

    session = await db["study_sessions"].find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get user to check plan and listen count
    user = await db["users"].find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user = UserInDB(**user)
    
    # Check listen limit for trial users
    current_count = session.get("listen_count", 0)
    if current_user.plan == UserPlan.TRIAL:
        if current_count >= 3:
            raise HTTPException(
                status_code=403,
                detail="TRIAL_LIMIT_EXCEEDED"
            )
    
    # Track listenCount for ALL users (Analytics + Limit enforcement)
    await db["study_sessions"].update_one(
        {"_id": session_id},
        {"$inc": {"listen_count": 1}}
    )
    
    return StreamingResponse(
        io.BytesIO(session["audio_data"]),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes"
        }
    )
