from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class StudyPrompt(BaseModel):
    prompt: str
    topic: str
    duration_minutes: int  # 3, 5, or 10
    exam_mode: bool = False
    text_highlighting: bool = False
    system_prompt: Optional[str] = None

class Question(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_answer: str

class StudySessionResponse(BaseModel):
    id: str
    topic: str
    prompt: str
    content: Optional[str] = None
    duration_minutes: int
    exam_mode: bool
    text_highlighting: Optional[bool] = False
    audio_url: Optional[str] = None
    listen_count: int = 0
    speech_marks: List[dict] = []
    questions: Optional[List[Question]] = None
    created_at: datetime

class StudyHistory(BaseModel):
    sessions: List[StudySessionResponse]
