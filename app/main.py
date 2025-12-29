from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection

from app.api.api_v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    # Validate SMTP configuration
    from app.services.email_service import email_service
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASS]):
        import logging
        logger = logging.getLogger(__name__)
        logger.error("!!! CRITICAL: SMTP EMAIL SERVICE NOT CONFIGURED !!!")
        logger.error("Users will not be able to receive OTP verification codes.")
    else:
        # Verify connection
        await email_service.verify_connection()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to Study.io API"}
