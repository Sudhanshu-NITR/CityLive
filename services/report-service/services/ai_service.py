# services/ai_service.py
import json
import google.genai as genai
from typing import Dict, List
from core.config import config

class AiService:
    def __init__(self, repository: Neo4jRepository = None):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.repository = repository

    def analyze_report(self, report_id: str, description: str, lat: float, lng: float) -> Dict:
        """Agentic flow: AI decides which tools to call to verify and group reports."""
        
        # 1. Define tools for the AI
        def get_nearby_context(radius_km: float = 1.0) -> Dict:
            """Fetches nearby incidents and reports from the graph database for context."""
            return self.repository.get_nearby_context(lat, lng, radius_km)

        def upsert_incident(incident_id: str, incident_type: str, title: str, 
                          reasoning: str, severity: int, priority: int) -> Dict:
            """Creates or updates an Incident node in the graph and links this report to it."""
            return self.repository.upsert_incident(
                incident_id=incident_id, lat=lat, lng=lng,
                incident_type=incident_type, title=title, description=reasoning,
                severity=severity, priority=priority, report_id=report_id
            )

        # 2. System Instructions
        sys_instruct = f"""
        You are the CityLive Sentinel Agent. A citizen has just submitted a report (ID: {report_id}).
        
        Report: "{description}" at Coordinates ({lat}, {lng}).
        
        Your Mission:
        1. Use `get_nearby_context` to see if there are existing `AnalyzedIncident` nodes nearby.
        2. CRITICAL: If you find a nearby `AnalyzedIncident` where `is_verified` is TRUE, and it covers the same issue, DISCARD this report. Do not call any other tools.
        3. If there is a nearby `AnalyzedIncident` that is NOT verified, update it using `upsert_incident`.
        4. If this is a new issue, create a new `AnalyzedIncident` using `upsert_incident` (generate a short uuid for incident_id).
        5. Assess Severity (1-10) and Priority (1-10). Priority increases as more reports are linked to one incident.
        6. Store these values in the `AnalyzedIncident`.
        
        Final Output: 
        - If discarded: "Report discarded as it relates to an already verified incident."
        - Otherwise: Return a JSON summary of your action.
        """

        try:
            # 3. Agentic Loop (Automatic Function Calling)
            chat = self.client.chats.create(
                model="gemini-2.0-flash",
                config={
                    "tools": [get_nearby_context, upsert_incident],
                    "system_instruction": sys_instruct
                }
            )
            
            response = chat.send_message(f"Analyze report {report_id}: {description}")
            
            # The last response should be the summary
            return {
                "is_valid": True,
                "analysis": response.text,
                "agent_metadata": "Agentic Tool Use Completed"
            }
        except Exception as e:
            print(f"Agentic analysis failed: {e}")
            return {"is_valid": False, "reasoning": str(e)}

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
