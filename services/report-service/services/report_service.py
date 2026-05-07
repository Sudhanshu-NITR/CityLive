# services/report_service.py
import uuid
from typing import Dict, Tuple, List
from domain.models import ReportRequest, PulseNode
from infrastructure.neo4j_repository import Neo4jRepository
from infrastructure.user_client import UserClient
from infrastructure.event_publisher import EventPublisher
from services.ai_service import AiService

class ReportService:
    def __init__(self, 
                 ai_service: AiService, 
                 repository: Neo4jRepository, 
                 user_client: UserClient, 
                 event_publisher: EventPublisher):
        # Dependency Injection
        self.ai_service = ai_service
        self.repository = repository
        self.user_client = user_client
        self.event_publisher = event_publisher

    def process_new_report(self, request: ReportRequest) -> Tuple[Dict, int]:
        # 1. Generate Report ID
        report_id = str(uuid.uuid4())[:8]

        # 2. Save Raw Report to Graph
        self.repository.create_report(
            report_id=report_id,
            user_id=request.user_id,
            description=request.description,
            lat=request.lat,
            lng=request.lng
        )
        
        # 3. Trigger Agentic AI Analysis
        # The agent will autonomously call 'get_nearby_context' and 'upsert_incident'
        analysis = self.ai_service.analyze_report(report_id, request.description, request.lat, request.lng)
        
        if not analysis.get("is_valid"):
            self.user_client.adjust_score(request.user_id, -20, f"AI Rejection: {analysis.get('reasoning')}")
            return {"status": "rejected", "message": "Sentinel Agent flagged the report."}, 400
            
        # 4. Reward User for participating
        self.user_client.adjust_score(request.user_id, 10, "Report processed by Sentinel Agent")
        
        return {
            "status": "success", 
            "message": "Report received and analyzed by Sentinel Agent.",
            "analysis": analysis.get("analysis")
        }, 201

    def get_all_reports(self) -> List[Dict]:
        return self.repository.get_all_incidents(verified_only=True)

    def get_pending_reports(self) -> List[Dict]:
        return self.repository.get_all_incidents(verified_only=False)

    def verify_report(self, incident_id: str) -> Dict:
        updated_incident = self.repository.verify_incident(incident_id)
        if updated_incident:
            # Broadcast the verified incident to the map
            self.event_publisher.publish_new_node(updated_incident)
            return {"status": "success", "message": "Incident verified and published."}
        return {"status": "error", "message": "Incident not found."}

    def get_predictive_insights(self) -> Tuple[List[Dict], int]:
        context_nodes = self.repository.get_context_nodes()
        
        if not context_nodes:
            return [{
                "title": "City Status Optimal", 
                "description": "No active hazards in the graph. Traffic and infrastructure are operating normally."
            }], 200
            
        insights = self.ai_service.generate_insights(context_nodes)
        return insights, 200
