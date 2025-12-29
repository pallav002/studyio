import requests
import json

def test_history():
    # Login
    resp = requests.post(
        "http://localhost:8000/api/v1/auth/login",
        data={"username": "test@study.io", "password": "password123"}
    )
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get history
    print("Fetching history...")
    resp = requests.get("http://localhost:8000/api/v1/study/history", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        history = resp.json()
        print(f"Found {len(history)} items")
        if history:
            print("\nLatest item:")
            print(json.dumps(history[0], indent=2))
    else:
        print(f"Error: {resp.text}")

if __name__ == "__main__":
    test_history()
