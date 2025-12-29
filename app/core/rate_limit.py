from fastapi import HTTPException, Request
from typing import Dict, List
import time

class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}

    async def __call__(self, request: Request):
        # Get client IP or user ID
        # For simplicity, we'll use client IP
        client_id = request.client.host
        
        now = time.time()
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Filter out old requests
        self.requests[client_id] = [t for t in self.requests[client_id] if now - t < self.window_seconds]
        
        if len(self.requests[client_id]) >= self.requests_limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        self.requests[client_id].append(now)

# 10 generations per hour
generation_limiter = RateLimiter(requests_limit=10, window_seconds=3600)
# 30 audio streams per hour
audio_limiter = RateLimiter(requests_limit=30, window_seconds=3600)
