from datetime import datetime, timedelta
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.schemas.admin import AppConfig, ConfigUpdate
from app.schemas.study import StudySessionResponse
from app.schemas.user import UserResponse, UserUpdate
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.get("/config", response_model=AppConfig)
async def get_app_config(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
) -> Any:
    # 1. Fetch the single config document
    config = await db["config"].find_one({"_id": "app_config"})
    
    # 2. Get default config from Pydantic model
    default_app_config = AppConfig()
    
    if not config:
        return default_app_config

    # 3. Strictly enforce the 5 MISSION-CRITICAL topics
    # We take their prompt templates from DB if available, but names are fixed.
    db_topics = config.get("topics", [])
    db_prompts = {t.get("name"): t.get("prompt_template") for t in db_topics if isinstance(t, dict)}
    
    final_topics = []
    for t in default_app_config.topics:
        # Use DB prompt if we have it for this fixed topic name
        if t.name in db_prompts and db_prompts[t.name]:
            t.prompt_template = db_prompts[t.name]
        final_topics.append(t)

    # 4. Merge other config fields (limits, etc)
    merged_data = default_app_config.dict()
    for k, v in config.items():
        if k in merged_data and k != "topics":
            merged_data[k] = v
            
    merged_data["topics"] = final_topics
    return merged_data

@router.put("/config", response_model=AppConfig)
async def update_app_config(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
    config_in: ConfigUpdate
) -> Any:
    update_data = config_in.dict(exclude_unset=True)
    
    # Simple direct update of the config document
    await db["config"].update_one(
        {"_id": "app_config"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_app_config(db, current_user)

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
) -> Any:
    cursor = db["users"].find()
    users = await cursor.to_list(length=100)
    return [{**u, "id": str(u["_id"])} for u in users]

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
    user_id: str,
    user_in: UserUpdate
) -> Any:
    update_data = user_in.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    result = await db["users"].find_one_and_update(
        {"_id": user_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {**result, "id": str(result["_id"])}

@router.get("/users/{user_id}/history", response_model=List[StudySessionResponse])
async def get_user_history(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
    user_id: str,
    date: str = None
) -> Any:
    query = {"user_id": user_id}
    if date:
        try:
            from datetime import datetime
            start_date = datetime.strptime(date, "%Y-%m-%d")
            end_date = start_date + timedelta(days=1)
            query["created_at"] = {"$gte": start_date, "$lt": end_date}
        except ValueError:
            pass

    cursor = db["study_sessions"].find(query, {"audio_data": 0, "speech_marks": 0}).sort("created_at", -1)
    sessions = await cursor.to_list(length=100)
    return [{**s, "id": str(s["_id"])} for s in sessions]

@router.get("/sessions", response_model=List[StudySessionResponse])
async def get_all_sessions(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
) -> Any:
    cursor = db["study_sessions"].find({}, {"content": 0, "audio_data": 0, "speech_marks": 0}).sort("created_at", -1).limit(100)
    sessions = await cursor.to_list(length=100)
    return [{**s, "id": str(s["_id"])} for s in sessions]

@router.get("/usage-report")
async def get_usage_report(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Any = Depends(deps.get_current_active_admin),
) -> Any:
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_openai_tokens": {"$sum": "$openai_tokens"},
                "total_polly_characters": {"$sum": "$polly_characters"},
                "total_openai_cost": {"$sum": "$openai_cost"},
                "total_polly_cost": {"$sum": "$polly_cost"},
                "total_cost": {"$sum": "$total_cost"},
                "total_sessions": {"$sum": 1}
            }
        }
    ]
    cursor = db["usage"].aggregate(pipeline)
    result = await cursor.to_list(length=1)
    
    summary = result[0] if result else {
        "total_openai_tokens": 0, "total_polly_characters": 0,
        "total_openai_cost": 0, "total_polly_cost": 0,
        "total_cost": 0, "total_sessions": 0
    }

    user_pipeline = [
        {"$group": {"_id": "$user_id", "openai_tokens": {"$sum": "$openai_tokens"}, "sessions": {"$sum": 1}}},
        {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "user_info"}},
        {"$unwind": "$user_info"},
        {"$project": {"email": "$user_info.email", "openai_tokens": 1, "sessions": 1}}
    ]
    user_cursor = db["usage"].aggregate(user_pipeline)
    user_usage = await user_cursor.to_list(length=100)

    return {"summary": summary, "user_usage": user_usage}
