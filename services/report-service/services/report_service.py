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
        # 1. AI Validation
        analysis = self.ai_service.analyze_report(request.description, request.title)
        
        if not analysis.get("is_valid"):
            self.user_client.adjust_score(request.user_id, -20, "Failed AI guardrail verification")
            return {"status": "rejected", "message": "Failed security guardrails."}, 400
            
        # 2. Reward User
        self.user_client.adjust_score(request.user_id, 20, "Successfully verified hazard")
        
        # 3. Create Domain Object
        category = analysis.get("category", "hazard")
        color = "text-red-500" if category == "hazard" else "text-amber-500"
        bg = "bg-red-500/10" if category == "hazard" else "bg-amber-500/10"
        
        new_node = PulseNode(
            id=str(uuid.uuid4())[:8],
            type=category,
            title=analysis.get("title", request.title),
            description=request.description,
            lat=request.lat,
            lng=request.lng,
            color=color,
            bg=bg
        )
        
        # 4. Save to Database
        saved_node = self.repository.create_pulse_node(new_node)
        
        # 5. Publish Event
        if saved_node:
            self.event_publisher.publish_new_node(saved_node)
            
        return {
            "status": "success", 
            "message": "Pulse report verified and saved.", 
            "node": saved_node.model_dump() if saved_node else None
        }, 201

    def get_all_reports(self) -> List[Dict]:
        return self.repository.get_all_nodes()

    def get_predictive_insights(self) -> Tuple[List[Dict], int]:
        context_nodes = self.repository.get_context_nodes()
        
        if not context_nodes:
            return [{
                "title": "City Status Optimal", 
                "description": "No active hazards in the graph. Traffic and infrastructure are operating normally."
            }], 200
            
        insights = self.ai_service.generate_insights(context_nodes)
        return insights, 200
