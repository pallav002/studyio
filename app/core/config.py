from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Study.io"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str = "study_io"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # SMTP
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: str = "Study.io <no-reply@study.io>"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
