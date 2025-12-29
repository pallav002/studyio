import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def promote_user():
    load_dotenv()
    mongodb_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongodb_url)
    db = client.studyio
    
    res = await db["users"].update_one(
        {"email": "test@study.io"},
        {
            "$set": {
                "plan": "premium",
                "is_paid": True,
                "features": {
                    "exam_mode": True,
                    "text_highlight": True,
                    "duration_limit": 10
                }
            }
        }
    )
    if res.modified_count > 0:
        print("Promoted test@study.io to PREMIUM")
    else:
        print("User not found or already premium")
    client.close()

if __name__ == "__main__":
    asyncio.run(promote_user())
