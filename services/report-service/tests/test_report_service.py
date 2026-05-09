# tests/test_report_service.py
"""
Unit tests for ReportService orchestration.
All four dependencies (ai_service, repository, user_client, event_publisher)
are mocked — tests only verify the coordination logic.
"""
import pytest
from unittest.mock import MagicMock, call
from domain.models import ReportRequest, AdminActionRequest


def make_request(description="Flooding on MG Road", user_id="citizen_001",
                 lat=12.9716, lng=77.5946):
    return ReportRequest(user_id=user_id, description=description, lat=lat, lng=lng)


# ── process_new_report ────────────────────────────────────────────────────────

class TestProcessNewReport:

    def test_returns_429_when_spam_detected(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = True

        result, status = full_service.process_new_report(make_request())

        assert status == 429
        assert "already submitted" in result["message"]
        # AI should never be called on spam
        full_service._mock_ai.analyze_report.assert_not_called()

    def test_anonymous_user_bypasses_spam_check(self, full_service):
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_anon"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": True, "action": "created_validation", "validation_id": "val_1"
        }
        full_service._mock_repo.get_all_validation_nodes.return_value = [
            {"id": "val_1", "severity": 5}
        ]

        result, status = full_service.process_new_report(make_request(user_id="anonymous"))

        full_service._mock_repo.check_recent_user_report.assert_not_called()
        assert status == 201

    def test_creates_report_node_before_ai_call(self, full_service):
        """Repo must be called BEFORE the AI agent."""
        call_order = []
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.side_effect = \
            lambda **_: call_order.append("repo") or {"id": "rep_001"}
        full_service._mock_ai.analyze_report.side_effect = \
            lambda **_: call_order.append("ai") or {
                "is_valid": True, "action": "created_validation", "validation_id": "val_1"
            }
        full_service._mock_repo.get_all_validation_nodes.return_value = []

        full_service.process_new_report(make_request())

        assert call_order.index("repo") < call_order.index("ai")

    def test_ai_discard_marks_report_discarded(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_001"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": False, "action": "discard", "reason": "Not a valid hazard report"
        }

        result, status = full_service.process_new_report(make_request())

        full_service._mock_repo.mark_report_discarded.assert_called_once()
        assert result["status"] == "discarded"

    def test_invalid_report_penalises_user_score(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_001"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": False, "action": "discard", "reason": "Not a valid hazard report"
        }

        full_service.process_new_report(make_request(user_id="citizen_001"))

        full_service._mock_user_client.adjust_score.assert_called_once()
        score_call = full_service._mock_user_client.adjust_score.call_args
        assert score_call.args[1] == -10  # penalty

    def test_valid_report_rewards_user(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_001"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": True, "action": "created_validation", "validation_id": "val_1"
        }
        full_service._mock_repo.get_all_validation_nodes.return_value = [{"id": "val_1"}]

        full_service.process_new_report(make_request(user_id="citizen_001"))

        score_call = full_service._mock_user_client.adjust_score.call_args
        assert score_call.args[1] == +10  # reward

    def test_valid_report_publishes_validation_update_sse(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_001"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": True, "action": "created_validation", "validation_id": "val_abc"
        }
        full_service._mock_repo.get_all_validation_nodes.return_value = [
            {"id": "val_abc", "severity": 7, "hazard_type": "Flooding"}
        ]

        full_service.process_new_report(make_request())

        full_service._mock_publisher.publish_validation_update.assert_called_once()
        published_node = full_service._mock_publisher.publish_validation_update.call_args.args[0]
        assert published_node["id"] == "val_abc"

    def test_returns_201_on_success(self, full_service):
        full_service._mock_repo.check_recent_user_report.return_value = False
        full_service._mock_repo.create_report_node.return_value = {"id": "rep_001"}
        full_service._mock_ai.analyze_report.return_value = {
            "is_valid": True, "action": "created_validation", "validation_id": "val_1"
        }
        full_service._mock_repo.get_all_validation_nodes.return_value = []

        _, status = full_service.process_new_report(make_request())
        assert status == 201


# ── handle_admin_action: approve ─────────────────────────────────────────────

class TestApproveValidation:

    def _setup_approve(self, full_service, validation_id="val_001"):
        full_service._mock_repo.get_all_validation_nodes.return_value = [
            {"id": validation_id, "hazard_type": "Flooding", "title": "MG Road",
             "ai_explanation": "3 reports", "severity": 7, "priority": 6,
             "report_count": 3, "lat": 12.97, "lng": 77.59}
        ]
        full_service._mock_ai.process_approval.return_value = {
            "success": True, "approved_id": "appr_001"
        }
        full_service._mock_repo.get_all_approved_nodes.return_value = [
            {"id": "appr_001", "validation_node_id": validation_id,
             "hazard_type": "Flooding", "is_active": True}
        ]

    def test_approve_returns_200(self, full_service):
        self._setup_approve(full_service)
        req = AdminActionRequest(action="approve", admin_id="admin_001", explanation="Confirmed")

        result, status = full_service.handle_admin_action("val_001", req)

        assert status == 200
        assert result["status"] == "approved"

    def test_approve_calls_ai_process_approval(self, full_service):
        self._setup_approve(full_service)
        req = AdminActionRequest(action="approve", admin_id="admin_001", explanation="OK")

        full_service.handle_admin_action("val_001", req)

        full_service._mock_ai.process_approval.assert_called_once()
        call_args = full_service._mock_ai.process_approval.call_args
        assert call_args.kwargs["validation_id"] == "val_001"
        assert call_args.kwargs["admin_id"] == "admin_001"

    def test_approve_broadcasts_approved_node_via_sse(self, full_service):
        self._setup_approve(full_service)
        req = AdminActionRequest(action="approve", admin_id="admin_001", explanation="OK")

        full_service.handle_admin_action("val_001", req)

        full_service._mock_publisher.publish_approved_node.assert_called_once()
        node = full_service._mock_publisher.publish_approved_node.call_args.args[0]
        assert node["validation_node_id"] == "val_001"

    def test_approve_returns_404_when_not_found(self, full_service):
        full_service._mock_repo.get_all_validation_nodes.return_value = []
        req = AdminActionRequest(action="approve", admin_id="admin_001", explanation="")

        result, status = full_service.handle_admin_action("val_ghost", req)

        assert status == 404


# ── handle_admin_action: reject ───────────────────────────────────────────────

class TestRejectValidation:

    def test_reject_returns_200(self, full_service):
        full_service._mock_repo.reject_validation_node.return_value = True
        req = AdminActionRequest(action="reject", admin_id="admin_001")

        result, status = full_service.handle_admin_action("val_001", req)

        assert status == 200
        assert result["status"] == "rejected"

    def test_reject_broadcasts_rejection_event(self, full_service):
        full_service._mock_repo.reject_validation_node.return_value = True
        req = AdminActionRequest(action="reject", admin_id="admin_001")

        full_service.handle_admin_action("val_001", req)

        full_service._mock_publisher.publish_validation_rejected.assert_called_once_with("val_001")

    def test_reject_returns_404_when_not_found(self, full_service):
        full_service._mock_repo.reject_validation_node.return_value = False
        req = AdminActionRequest(action="reject", admin_id="admin_001")

        result, status = full_service.handle_admin_action("val_ghost", req)

        assert status == 404

    def test_unknown_action_returns_400(self, full_service):
        req = AdminActionRequest(action="delete", admin_id="admin_001")

        result, status = full_service.handle_admin_action("val_001", req)

        assert status == 400
