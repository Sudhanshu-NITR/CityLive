# tests/test_ai_service.py
"""
Unit tests for AiService (Sentinel Agent, Approval Agent, Predictive Agent).
Gemini client and repository are fully mocked — no API calls made.
"""
import json
import pytest
from unittest.mock import MagicMock, patch, call


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_chat_response(text: str):
    resp = MagicMock()
    resp.text = text
    return resp


def build_ai_service(mock_repo, gemini_response_text: str):
    """
    Return an AiService whose Gemini chat always returns `gemini_response_text`
    as the final message. Tool calls are simulated by having the mock_repo
    return values from its methods.
    """
    with patch("services.ai_service.genai") as mock_genai:
        mock_chat = MagicMock()
        mock_chat.send_message.return_value = make_chat_response(gemini_response_text)
        mock_genai.Client.return_value.chats.create.return_value = mock_chat
        mock_genai.Client.return_value.models.generate_content.return_value = \
            make_chat_response(gemini_response_text)

        from services.ai_service import AiService
        svc = AiService(repository=mock_repo)
        svc._mock_genai = mock_genai
        return svc


# ── Sentinel Agent: analyze_report ───────────────────────────────────────────

class TestSentinelAgent:

    def test_discards_when_approved_node_nearby(self):
        """Sentinel returns action=discard when Gemini decides report is redundant."""
        mock_repo = MagicMock()
        decision = json.dumps({"action": "discard", "reason": "Covered by active ApprovedNode appr_001"})
        svc = build_ai_service(mock_repo, decision)

        result = svc.analyze_report("rep_001", "Flooding here", 12.97, 77.59)

        assert result["is_valid"] is False
        assert result["action"] == "discard"
        assert "appr_001" in result["reason"]

    def test_returns_valid_when_validation_created(self):
        """Sentinel returns action=created_validation on new cluster."""
        mock_repo = MagicMock()
        decision = json.dumps({
            "action": "created_validation",
            "validation_id": "val_abc123",
            "severity": 7,
            "priority": 6,
        })
        svc = build_ai_service(mock_repo, decision)

        result = svc.analyze_report("rep_002", "Serious flooding on main road", 12.97, 77.59)

        assert result["is_valid"] is True
        assert result["action"] == "created_validation"
        assert result["validation_id"] == "val_abc123"
        assert result["severity"] == 7

    def test_returns_valid_when_validation_updated(self):
        """Sentinel returns action=updated_validation on existing cluster."""
        mock_repo = MagicMock()
        decision = json.dumps({
            "action": "updated_validation",
            "validation_id": "val_existing",
            "severity": 8,
            "priority": 7,
        })
        svc = build_ai_service(mock_repo, decision)

        result = svc.analyze_report("rep_003", "Still flooding, getting worse", 12.97, 77.59)

        assert result["is_valid"] is True
        assert result["action"] == "updated_validation"
        assert result["validation_id"] == "val_existing"

    def test_discards_gibberish_report(self):
        """Sentinel discards clearly invalid reports."""
        mock_repo = MagicMock()
        decision = json.dumps({"action": "discard", "reason": "Not a valid hazard report"})
        svc = build_ai_service(mock_repo, decision)

        result = svc.analyze_report("rep_junk", "asdfghjkl test 123", 12.97, 77.59)

        assert result["is_valid"] is False
        assert result["action"] == "discard"

    def test_handles_gemini_exception_gracefully(self):
        """On Gemini API failure, analyze_report returns is_valid=False without raising."""
        mock_repo = MagicMock()
        with patch("services.ai_service.genai") as mock_genai:
            mock_genai.Client.return_value.chats.create.side_effect = Exception("API timeout")

            from services.ai_service import AiService
            svc = AiService(repository=mock_repo)
            result = svc.analyze_report("rep_err", "Some report", 12.97, 77.59)

        assert result["is_valid"] is False
        assert result["action"] == "error"
        assert "API timeout" in result["reason"]

    def test_handles_malformed_json_response(self):
        """Gemini returning free text (not JSON) is handled without crashing."""
        mock_repo = MagicMock()
        svc = build_ai_service(mock_repo, "The report has been processed successfully.")

        result = svc.analyze_report("rep_004", "Some hazard", 12.0, 77.0)

        # Should not raise; is_valid should be True (treated as processed)
        assert result["is_valid"] is True

    def test_strips_markdown_fences_from_response(self):
        """JSON wrapped in ```json ... ``` code fences is parsed correctly."""
        mock_repo = MagicMock()
        raw = "```json\n" + json.dumps({
            "action": "created_validation",
            "validation_id": "val_fenced",
            "severity": 5,
            "priority": 4,
        }) + "\n```"
        svc = build_ai_service(mock_repo, raw)

        result = svc.analyze_report("rep_005", "Test report", 12.0, 77.0)

        assert result["is_valid"] is True
        assert result["validation_id"] == "val_fenced"


# ── Approval Agent: process_approval ─────────────────────────────────────────

class TestApprovalAgent:
    VALIDATION_DATA = {
        "id": "val_001", "hazard_type": "Flooding", "title": "MG Road flooding",
        "ai_explanation": "3 corroborating reports", "severity": 7, "priority": 6,
        "report_count": 3, "lat": 12.97, "lng": 77.59,
    }

    def test_returns_success_true_on_approval(self):
        mock_repo = MagicMock()
        mock_repo.create_approved_node.return_value = {"id": "appr_001", "is_active": True}
        decision = json.dumps({"status": "approved", "approved_id": "appr_001"})
        svc = build_ai_service(mock_repo, decision)

        result = svc.process_approval(
            "val_001", "admin_001", "Verified in person", self.VALIDATION_DATA
        )

        assert result["success"] is True

    def test_fallback_creates_node_directly_on_exception(self):
        """If Gemini throws, the fallback path creates the ApprovedNode directly."""
        mock_repo = MagicMock()
        mock_repo.create_approved_node.return_value = {"id": "appr_fallback"}

        with patch("services.ai_service.genai") as mock_genai:
            mock_genai.Client.return_value.chats.create.side_effect = Exception("Network error")
            from services.ai_service import AiService
            svc = AiService(repository=mock_repo)

        result = svc.process_approval(
            "val_001", "admin_001", "Verified", self.VALIDATION_DATA
        )

        assert result["success"] is True
        assert result.get("fallback") is True
        mock_repo.create_approved_node.assert_called_once_with(
            validation_id="val_001",
            admin_id="admin_001",
            admin_explanation="Verified",
            ai_post_approval_notes="Approved by administrator.",
        )


# ── Predictive Agent: generate_insights ──────────────────────────────────────

class TestPredictiveAgent:

    def test_returns_list_of_insights(self):
        mock_repo = MagicMock()
        insights = [{"title": "Risk A", "description": "Desc A"}]
        svc = build_ai_service(mock_repo, json.dumps(insights))

        result = svc.generate_insights([{"id": "a1", "hazard_type": "Flooding"}])

        assert isinstance(result, list)
        assert result[0]["title"] == "Risk A"

    def test_returns_default_when_no_context(self):
        mock_repo = MagicMock()
        svc = build_ai_service(mock_repo, "irrelevant")

        result = svc.generate_insights([])

        assert len(result) == 1
        assert "normally" in result[0]["title"].lower() or "optimal" in result[0]["title"].lower()

    def test_handles_bad_json_from_gemini(self):
        """Gemini returns garbage — should not crash, returns error insight."""
        mock_repo = MagicMock()
        svc = build_ai_service(mock_repo, "This is not JSON at all { broken")

        result = svc.generate_insights([{"id": "a1"}])

        assert isinstance(result, list)
        assert len(result) >= 1
        # Should return error insight, not raise
        assert "title" in result[0]
