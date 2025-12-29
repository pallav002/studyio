import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check_admin():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    user = await db["users"].find_one({"email": "admin@study29.io"})
    print(user)

if __name__ == "__main__":
    asyncio.run(check_admin())
