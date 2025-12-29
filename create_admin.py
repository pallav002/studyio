import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core import security
import uuid

async def create_admin():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    email = "admin@study29.io"
    password = "adminpassword12"
    
    user = await db["users"].find_one({"email": email})
    if user:
        print(f"User {email} already exists.")
        return

    hashed_password = security.get_password_hash(password)
    user_dict = {
        "_id": str(uuid.uuid4()),
        "email": email,
        "full_name": "System Admin",
        "hashed_password": hashed_password,
        "is_active": True,
        "role": "admin",
        "plan": "paid"
    }
    
    await db["users"].insert_one(user_dict)
    print(f"Admin user created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
