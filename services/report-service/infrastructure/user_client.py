# infrastructure/user_client.py
from google.genai.live import requests
import requests
from core.config import config

class UserClient:
    def __init__(self):
        self.base_url = config.USER_SERVICE_URL
    
    def adjust_score(self, user_id: str, adjustment: int, reason: str):
        if user_id == "anonymous":
            return
        
        try:
            url = f"{self.base_url}/api/v1/users/{user_id}/adjust-score"
            payload = {"adjustment": adjustment, "reason": reason}
            requests.post(url, json=payload, timeout=2)
        except requests.exceptions.RequestException as e:
            print(f"Warning: Failed to update user score: {e}")