from typing import List
from fastapi import APIRouter, Depends
from app.api import deps
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserInDB
from app.schemas.admin import AppConfig

router = APIRouter()

@router.get("/active")
async def get_active_topics(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(deps.get_current_active_user),
) -> List[dict]:
    """
    Returns the fixed list of active topics. 
    Always returned Math, Physics, Biology, Chemistry, History.
    """
    # Simply return the fixed names from the schema
    return [{"name": t.name} for t in AppConfig().topics]
