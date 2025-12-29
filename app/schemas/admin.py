from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TopicPrompt(BaseModel):
    name: str
    prompt_template: str

class AppConfig(BaseModel):
    allowed_durations: List[int] = [3, 5, 10]
    character_limits: Dict[str, int] = {
        "3": 2500,
        "5": 4500,
        "10": 9000
    }
    trial_limit_sessions: int = 3
    trial_max_duration: int = 5
    daily_generation_limit: int = 5
    # Simplified structure: List of TopicPrompt
    topics: List[TopicPrompt] = [
        TopicPrompt(name="Math", prompt_template="You are an expert Math tutor. Generate a comprehensive study guide about {topic}."),
        TopicPrompt(name="Physics", prompt_template="You are an expert Physics tutor. Generate a comprehensive study guide about {topic}."),
        TopicPrompt(name="Biology", prompt_template="You are an expert Biology tutor. Generate a comprehensive study guide about {topic}."),
        TopicPrompt(name="Chemistry", prompt_template="You are an expert Chemistry tutor. Generate a comprehensive study guide about {topic}."),
        TopicPrompt(name="History", prompt_template="You are an expert History tutor. Generate a comprehensive study guide about {topic}."),
    ]
    features_enabled: Dict[str, bool] = {
        "audio_generation": True,
        "history_view": True,
        "exam_mode": True,
        "text_highlighting": True
    }
    plan_access: Dict[str, Any] = {} # This will be populated from DB or defaults

class ConfigUpdate(BaseModel):
    allowed_durations: Optional[List[int]] = None
    character_limits: Optional[Dict[str, int]] = None
    trial_limit_sessions: Optional[int] = None
    trial_max_duration: Optional[int] = None
    daily_generation_limit: Optional[int] = None
    features_enabled: Optional[Dict[str, bool]] = None
    topics: Optional[List[TopicPrompt]] = None
