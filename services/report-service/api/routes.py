# api/routes.py
from fastapi import APIRouter, Depends, HTTPException, Header, status
from typing import Optional
from domain.models import ReportRequest, AdminActionRequest
from services.ai_service import AiService
from services.report_service import ReportService
from infrastructure.neo4j_repository import Neo4jRepository
from infrastructure.user_client import UserClient
from infrastructure.event_publisher import EventPublisher

router = APIRouter()


# ── Dependency Injection ───────────────────────────────────────────────────

def get_report_service() -> ReportService:
    repository = Neo4jRepository()
    ai_service = AiService(repository=repository)
    user_client = UserClient()
    event_publisher = EventPublisher()
    return ReportService(ai_service, repository, user_client, event_publisher)


# ── Health ─────────────────────────────────────────────────────────────────

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "report-service"}


# ── USER ROUTES ────────────────────────────────────────────────────────────

@router.post("/api/v1/reports", status_code=status.HTTP_201_CREATED)
def submit_report(
    report_req: ReportRequest,
    service: ReportService = Depends(get_report_service),
):
    """
    Citizens submit hazard reports here.
    The Sentinel Agent autonomously triages, validates, and clusters them.
    """
    response_data, status_code = service.process_new_report(report_req)
    if status_code == 429:
        raise HTTPException(status_code=429, detail=response_data["message"])
    return response_data


@router.get("/api/v1/approved_nodes")
def get_approved_nodes(service: ReportService = Depends(get_report_service)):
    """
    Returns all active ApprovedNodes for the user-facing map.
    These are large red markers — admin-verified hazards.
    """
    return service.get_approved_nodes()


@router.get("/api/v1/validation_nodes")
def get_validation_nodes(service: ReportService = Depends(get_report_service)):
    """
    Returns all pending ValidationNodes for the admin dashboard.
    Includes linked ReportNode summaries, sorted by severity + priority.
    """
    return service.get_validation_nodes()


@router.get("/api/v1/validation/{validation_id}/reports")
def get_reports_for_validation(
    validation_id: str,
    service: ReportService = Depends(get_report_service),
):
    """Returns all ReportNodes linked to a specific ValidationNode."""
    return service.get_reports_for_validation(validation_id)


# ── ADMIN ROUTES ───────────────────────────────────────────────────────────

@router.post("/api/v1/admin/validate/{validation_id}")
def admin_action(
    validation_id: str,
    action_req: AdminActionRequest,
    service: ReportService = Depends(get_report_service),
):
    """
    Admin approves or rejects a ValidationNode.
    - approve: Approval Agent creates ApprovedNode, broadcasts live red marker.
    - reject: ValidationNode + linked ReportNodes marked discarded.
    """
    if action_req.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=400,
            detail="action must be 'approve' or 'reject'",
        )
    response_data, status_code = service.handle_admin_action(validation_id, action_req)
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=response_data.get("message"))
    return response_data


# ── AI INSIGHTS ────────────────────────────────────────────────────────────

@router.get("/api/v1/ai-insights")
def get_ai_insights(service: ReportService = Depends(get_report_service)):
    """Predictive Agent analyzes active hazards and returns risk insights."""
    insights, status_code = service.get_predictive_insights()
    if status_code == 500:
        raise HTTPException(status_code=500, detail="Insight generation failed")
    return insights
