import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check_config():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    config = await db["config"].find_one({"_id": "app_config"})
    print("Plan Access:", config.get("plan_access"))
    print("Allowed Durations:", config.get("allowed_durations"))

if __name__ == "__main__":
    asyncio.run(check_config())
