# api/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from domain.models import ReportRequest
from services.ai_service import AiService
from services.report_service import ReportService
from infrastructure.neo4j_repository import Neo4jRepository
from infrastructure.user_client import UserClient
from infrastructure.event_publisher import EventPublisher

router = APIRouter()

# Dependency Injection using FastAPI's built-in system
def get_report_service():
    ai_service = AiService()
    repository = Neo4jRepository()
    user_client = UserClient()
    event_publisher = EventPublisher()
    return ReportService(ai_service, repository, user_client, event_publisher)

@router.get("/health")
def health_check():
    return {"status": "healthy"}

@router.post("/api/v1/reports", status_code=status.HTTP_201_CREATED)
def submit_report(report_req: ReportRequest, service: ReportService = Depends(get_report_service)):
    # *Note: We need to adjust ReportService slightly to raise an Exception instead of returning a tuple like (dict, 400)*
    response_data, status_code = service.process_new_report(report_req)
    
    if status_code == 400:
        raise HTTPException(status_code=400, detail=response_data["message"])
        
    return response_data

@router.get("/api/v1/verified_nodes")
def get_verified_nodes(service: ReportService = Depends(get_report_service)):
    return service.get_all_reports()

@router.get("/api/v1/pending_reports")
def get_pending_reports(service: ReportService = Depends(get_report_service)):
    return service.get_pending_reports()

@router.post("/api/v1/verify/{node_id}")
def verify_report(node_id: str, service: ReportService = Depends(get_report_service)):
    return service.verify_report(node_id)

@router.get("/api/v1/ai-insights")
def get_ai_insights(service: ReportService = Depends(get_report_service)):
    insights, status_code = service.get_predictive_insights()
    if status_code == 500:
         raise HTTPException(status_code=500, detail="Insight generation failed")
    return insights
