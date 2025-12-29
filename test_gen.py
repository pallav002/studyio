import requests
import json
import time

def test_gen():
    # Login
    resp = requests.post(
        "http://localhost:8000/api/v1/auth/login",
        data={"username": "test@study.io", "password": "password123"}
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "topic": "Math",
        "prompt": "Basic addition",
        "duration_minutes": 3,
        "exam_mode": False,
        "text_highlighting": False
    }
    
    print("Sending generation request...")
    start = time.time()
    resp = requests.post(
        "http://localhost:8000/api/v1/study/generate",
        json=payload,
        headers=headers,
        timeout=120
    )
    duration = time.time() - start
    print(f"Status: {resp.status_code}")
    print(f"Time: {duration:.2f}s")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_gen()
