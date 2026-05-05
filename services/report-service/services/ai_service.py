# services/ai_service.py
import json
import google.genai as genai
from typing import Dict, List
from core.config import config

class AiService:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)

    def analyze_report(self, description: str, location: str) -> Dict:
        prompt = f"""
        You are the CityLive Sentinel Agent. Analyze the following citizen report.
        Location: {location}
        Description: {description}
        
        Tasks:
        1. Determine the category: 'hazard' or 'congestion'.
        2. Assess credibility.
        3. Generate a concise title.
        
        Respond strictly in JSON format like this:
        {{"is_valid": true, "category": "hazard", "title": "Brief Title"}}
        """
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"Agent analysis failed: {e}")
            return {"is_valid": False}

    def generate_insights(self, context_nodes: List[Dict]) -> List[Dict]:
        prompt = f"""
        You are the CityLive Predictive Agent. Analyze these active city hazards from our Neo4j Graph DB:
        {context_nodes}
        
        Task: Identify potential cascading effects, future risks, or secondary disruptions.
        
        Output strictly as a JSON array of 1 or 2 insight objects:
        [
          {{ 
            "title": "Warning Title", 
            "description": "Explanation of forecasted risk." 
          }}
        ]
        """
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"Insight generation failed: {e}")
            return [{"title": "Analysis Error", "description": "Sentinel AI offline."}]
