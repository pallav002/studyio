import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.schemas.admin import AppConfig

async def update_db_config():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # Get default config from schema
    default_config = AppConfig().dict()
    
    # Explicitly ensure text_highlighting includes trial
    if "trial" not in default_config["plan_access"]["text_highlighting"]:
        default_config["plan_access"]["text_highlighting"].append("trial")
    
    # Update or create the app_config document
    result = await db["config"].update_one(
        {"_id": "app_config"},
        {"$set": default_config},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"Created new app_config with ID: {result.upserted_id}")
    else:
        print(f"Updated existing app_config (Matched: {result.matched_count}, Modified: {result.modified_count})")
    
    print("New Config Applied:")
    print(default_config)

if __name__ == "__main__":
    asyncio.run(update_db_config())
