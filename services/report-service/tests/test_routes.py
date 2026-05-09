# tests/test_routes.py
"""
Integration tests for FastAPI routes using TestClient.
The ReportService dependency is overridden with a MagicMock,
so no real DB, AI, or SSE connections are made.
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def app_client():
    """TestClient with ReportService dependency fully mocked."""
    from app import app
    from api.routes import get_report_service

    mock_svc = MagicMock()
    app.dependency_overrides[get_report_service] = lambda: mock_svc

    with TestClient(app, raise_server_exceptions=False) as client:
        client.mock_svc = mock_svc
        yield client

    app.dependency_overrides.clear()


VALID_REPORT_PAYLOAD = {
    "user_id": "citizen_001",
    "description": "Major flooding near underpass",
    "lat": 12.9716,
    "lng": 77.5946,
}


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_check(app_client):
    response = app_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ── POST /api/v1/reports ──────────────────────────────────────────────────────

class TestSubmitReport:

    def test_returns_201_on_success(self, app_client):
        app_client.mock_svc.process_new_report.return_value = (
            {"status": "success", "message": "Analyzed"}, 201
        )
        response = app_client.post("/api/v1/reports", json=VALID_REPORT_PAYLOAD)
        assert response.status_code == 201
        assert response.json()["status"] == "success"

    def test_returns_429_on_spam(self, app_client):
        app_client.mock_svc.process_new_report.return_value = (
            {"status": "rejected", "message": "You already submitted a report"}, 429
        )
        response = app_client.post("/api/v1/reports", json=VALID_REPORT_PAYLOAD)
        assert response.status_code == 429

    def test_returns_400_on_missing_description(self, app_client):
        response = app_client.post("/api/v1/reports", json={"user_id": "x", "lat": 12.0, "lng": 77.0})
        assert response.status_code == 422  # Pydantic validation error

    def test_returns_400_on_missing_lat_lng(self, app_client):
        response = app_client.post("/api/v1/reports", json={"description": "test"})
        assert response.status_code == 422

    def test_discarded_report_returns_200(self, app_client):
        """Discarded reports return 200 (user is informed, not errored)."""
        app_client.mock_svc.process_new_report.return_value = (
            {"status": "discarded", "message": "Covered by ApprovedNode"}, 200
        )
        response = app_client.post("/api/v1/reports", json=VALID_REPORT_PAYLOAD)
        # The route wraps 429 only; 200 discards pass through
        assert response.status_code in (200, 201)


# ── GET /api/v1/approved_nodes ────────────────────────────────────────────────

class TestApprovedNodes:

    def test_returns_list(self, app_client):
        app_client.mock_svc.get_approved_nodes.return_value = [
            {"id": "appr_001", "hazard_type": "Flooding", "is_active": True}
        ]
        response = app_client.get("/api/v1/approved_nodes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert data[0]["id"] == "appr_001"

    def test_returns_empty_list_when_none(self, app_client):
        app_client.mock_svc.get_approved_nodes.return_value = []
        response = app_client.get("/api/v1/approved_nodes")
        assert response.status_code == 200
        assert response.json() == []


# ── GET /api/v1/validation_nodes ─────────────────────────────────────────────

class TestValidationNodes:

    def test_returns_list(self, app_client):
        app_client.mock_svc.get_validation_nodes.return_value = [
            {"id": "val_001", "hazard_type": "Flooding", "severity": 7, "priority": 6}
        ]
        response = app_client.get("/api/v1/validation_nodes")
        assert response.status_code == 200
        data = response.json()
        assert data[0]["severity"] == 7

    def test_returns_empty_list(self, app_client):
        app_client.mock_svc.get_validation_nodes.return_value = []
        response = app_client.get("/api/v1/validation_nodes")
        assert response.status_code == 200
        assert response.json() == []


# ── GET /api/v1/validation/{id}/reports ──────────────────────────────────────

class TestValidationReports:

    def test_returns_linked_reports(self, app_client):
        app_client.mock_svc.get_reports_for_validation.return_value = [
            {"id": "rep_001", "description": "Flooding"},
            {"id": "rep_002", "description": "More flooding"},
        ]
        response = app_client.get("/api/v1/validation/val_001/reports")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_returns_empty_when_no_reports(self, app_client):
        app_client.mock_svc.get_reports_for_validation.return_value = []
        response = app_client.get("/api/v1/validation/val_999/reports")
        assert response.status_code == 200
        assert response.json() == []


# ── POST /api/v1/admin/validate/{id} ─────────────────────────────────────────

class TestAdminValidate:

    def test_approve_returns_200(self, app_client):
        app_client.mock_svc.handle_admin_action.return_value = (
            {"status": "approved", "message": "Live on map"}, 200
        )
        response = app_client.post(
            "/api/v1/admin/validate/val_001",
            json={"action": "approve", "admin_id": "admin_001", "explanation": "Confirmed"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    def test_reject_returns_200(self, app_client):
        app_client.mock_svc.handle_admin_action.return_value = (
            {"status": "rejected", "message": "Discarded"}, 200
        )
        response = app_client.post(
            "/api/v1/admin/validate/val_001",
            json={"action": "reject", "admin_id": "admin_001"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_invalid_action_returns_400(self, app_client):
        response = app_client.post(
            "/api/v1/admin/validate/val_001",
            json={"action": "delete", "admin_id": "admin_001"}
        )
        assert response.status_code == 400

    def test_not_found_returns_404(self, app_client):
        app_client.mock_svc.handle_admin_action.return_value = (
            {"status": "error", "message": "Not found"}, 404
        )
        response = app_client.post(
            "/api/v1/admin/validate/val_ghost",
            json={"action": "approve", "admin_id": "admin_001", "explanation": ""}
        )
        assert response.status_code == 404

    def test_missing_admin_id_returns_422(self, app_client):
        response = app_client.post(
            "/api/v1/admin/validate/val_001",
            json={"action": "approve"}
        )
        assert response.status_code == 422


# ── GET /api/v1/ai-insights ───────────────────────────────────────────────────

class TestAIInsights:

    def test_returns_insights_list(self, app_client):
        app_client.mock_svc.get_predictive_insights.return_value = (
            [{"title": "Risk A", "description": "Flooding may spread"}], 200
        )
        response = app_client.get("/api/v1/ai-insights")
        assert response.status_code == 200
        data = response.json()
        assert data[0]["title"] == "Risk A"

    def test_empty_context_returns_default(self, app_client):
        app_client.mock_svc.get_predictive_insights.return_value = (
            [{"title": "City Operating Normally", "description": "No hazards"}], 200
        )
        response = app_client.get("/api/v1/ai-insights")
        assert response.status_code == 200
