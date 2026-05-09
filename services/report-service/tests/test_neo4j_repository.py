# tests/test_neo4j_repository.py
"""
Unit tests for Neo4jRepository.
All tests mock the Neo4j driver — no real database required.
"""
import pytest
from unittest.mock import MagicMock, patch


# ── Mock building helpers ────────────────────────────────────────────────────

def make_record(key: str, value: dict):
    """Create a mock neo4j record that returns value on record[key]."""
    record = MagicMock()
    record.__getitem__ = MagicMock(side_effect=lambda k: value if k == key else None)
    return record


def make_count_record(key: str, count: int):
    record = MagicMock()
    record.__getitem__ = MagicMock(side_effect=lambda k: count if k == key else None)
    return record


def build_repo_with_session(session_mock):
    """
    Patch infrastructure.database.db so get_driver() returns a driver
    whose session() context manager yields session_mock.
    """
    driver_mock = MagicMock()
    driver_mock.session.return_value.__enter__ = MagicMock(return_value=session_mock)
    driver_mock.session.return_value.__exit__ = MagicMock(return_value=False)

    with patch("infrastructure.database.db") as db_mock:
        db_mock.get_driver.return_value = driver_mock
        from infrastructure.neo4j_repository import Neo4jRepository
        repo = Neo4jRepository()
        # Inject the driver directly so session() works outside the patch scope
        repo.driver = driver_mock
    return repo


def make_session(single_record=None, iter_records=None):
    """Build a mock neo4j session with configurable run() results."""
    session = MagicMock()
    result = MagicMock()
    result.single.return_value = single_record
    result.__iter__ = MagicMock(return_value=iter(iter_records or []))
    session.run.return_value = result
    return session


# ── create_report_node ───────────────────────────────────────────────────────

class TestCreateReportNode:
    def test_returns_report_dict(self):
        expected = {"id": "rep_abc", "description": "Flooding", "status": "pending"}
        session = make_session(single_record=make_record("report", expected))
        repo = build_repo_with_session(session)

        result = repo.create_report_node("rep_abc", "user_1", "Flooding", 12.97, 77.59)

        assert result == expected

    def test_session_run_is_called(self):
        session = make_session(single_record=make_record("report", {"id": "rep_x"}))
        repo = build_repo_with_session(session)
        repo.create_report_node("rep_x", "citizen_001", "Test hazard", 12.0, 77.0)
        session.run.assert_called_once()

    def test_query_contains_user_id(self):
        session = make_session(single_record=make_record("report", {"id": "rep_y"}))
        repo = build_repo_with_session(session)
        repo.create_report_node("rep_y", "citizen_001", "Test", 12.0, 77.0)
        call_kwargs = session.run.call_args
        assert "citizen_001" in str(call_kwargs)


# ── check_recent_user_report ─────────────────────────────────────────────────

class TestCheckRecentUserReport:
    def test_returns_true_when_count_is_1(self):
        session = make_session(single_record=make_count_record("cnt", 1))
        repo = build_repo_with_session(session)
        assert repo.check_recent_user_report("citizen_001", 12.97, 77.59) is True

    def test_returns_false_when_count_is_0(self):
        session = make_session(single_record=make_count_record("cnt", 0))
        repo = build_repo_with_session(session)
        assert repo.check_recent_user_report("citizen_001", 12.97, 77.59) is False

    def test_returns_true_when_multiple_recent_reports(self):
        session = make_session(single_record=make_count_record("cnt", 3))
        repo = build_repo_with_session(session)
        assert repo.check_recent_user_report("citizen_001", 12.97, 77.59) is True


# ── mark_report_discarded / clustered ────────────────────────────────────────

class TestMarkReport:
    def test_mark_discarded_runs_cypher_with_discarded(self):
        session = make_session()
        repo = build_repo_with_session(session)
        repo.mark_report_discarded("rep_001")
        session.run.assert_called_once()
        assert "discarded" in str(session.run.call_args)

    def test_mark_clustered_runs_cypher_with_clustered(self):
        session = make_session()
        repo = build_repo_with_session(session)
        repo.mark_report_clustered("rep_002")
        session.run.assert_called_once()
        assert "clustered" in str(session.run.call_args)


# ── get_nearby_context ────────────────────────────────────────────────────────

class TestGetNearbyContext:
    def _node_record(self, node_type: str, data: dict):
        rec = MagicMock()
        rec.__getitem__ = MagicMock(
            side_effect=lambda k: node_type if k == "node_type" else data
        )
        return rec

    def test_returns_empty_context_when_no_nodes(self):
        session = make_session(iter_records=[])
        repo = build_repo_with_session(session)
        ctx = repo.get_nearby_context(12.97, 77.59, 1.0)
        assert ctx == {"approved_nodes": [], "validation_nodes": [], "report_nodes": []}

    def test_categorises_approved_node_correctly(self):
        records = [self._node_record("ApprovedNode", {"id": "a1"})]
        session = make_session(iter_records=records)
        repo = build_repo_with_session(session)
        ctx = repo.get_nearby_context(12.97, 77.59, 1.0)
        assert len(ctx["approved_nodes"]) == 1
        assert len(ctx["validation_nodes"]) == 0
        assert len(ctx["report_nodes"]) == 0

    def test_categorises_all_three_node_types(self):
        records = [
            self._node_record("ApprovedNode", {"id": "a1"}),
            self._node_record("ValidationNode", {"id": "v1"}),
            self._node_record("ReportNode", {"id": "r1"}),
        ]
        session = make_session(iter_records=records)
        repo = build_repo_with_session(session)
        ctx = repo.get_nearby_context(12.97, 77.59, 1.0)
        assert len(ctx["approved_nodes"]) == 1
        assert len(ctx["validation_nodes"]) == 1
        assert len(ctx["report_nodes"]) == 1


# ── create_validation_node ────────────────────────────────────────────────────

class TestCreateValidationNode:
    def test_returns_validation_dict(self):
        expected = {"id": "val_test123", "hazard_type": "Flooding", "severity": 7}
        session = make_session(single_record=make_record("validation", expected))
        repo = build_repo_with_session(session)
        result = repo.create_validation_node(
            "rep_001", 12.97, 77.59, "Flooding", "Flooding near underpass", "AI exp", 7, 6
        )
        assert result["hazard_type"] == "Flooding"
        assert result["severity"] == 7

    def test_generated_id_starts_with_val_prefix(self):
        session = make_session(single_record=make_record("validation", {"id": "val_abc"}))
        repo = build_repo_with_session(session)
        repo.create_validation_node("rep_x", 12.0, 77.0, "Fire", "Title", "Explanation", 8, 7)
        # The auto-generated id is embedded in the Cypher query params
        assert "val_" in str(session.run.call_args)

    def test_links_report_to_validation_in_query(self):
        session = make_session(single_record=make_record("validation", {"id": "val_1"}))
        repo = build_repo_with_session(session)
        repo.create_validation_node("rep_specific", 12.0, 77.0, "Flooding", "T", "E", 5, 4)
        assert "rep_specific" in str(session.run.call_args)


# ── create_approved_node ──────────────────────────────────────────────────────

class TestCreateApprovedNode:
    def test_returns_approved_dict(self):
        expected = {"id": "appr_001", "admin_id": "admin_001", "is_active": True}
        session = make_session(single_record=make_record("approved", expected))
        repo = build_repo_with_session(session)
        result = repo.create_approved_node("val_001", "admin_001", "Verified", "Deploy crew")
        assert result["is_active"] is True
        assert result["admin_id"] == "admin_001"

    def test_returns_none_when_validation_not_found(self):
        session = make_session(single_record=None)
        repo = build_repo_with_session(session)
        result = repo.create_approved_node("nonexistent", "admin_001", "Test", "")
        assert result is None

    def test_approved_id_has_appr_prefix(self):
        session = make_session(single_record=make_record("approved", {"id": "appr_xyz"}))
        repo = build_repo_with_session(session)
        repo.create_approved_node("val_001", "admin_001", "Approved", "")
        assert "appr_" in str(session.run.call_args)


# ── reject_validation_node ────────────────────────────────────────────────────

class TestRejectValidationNode:
    def test_returns_true_on_success(self):
        session = make_session(single_record=make_count_record("updated", 2))
        repo = build_repo_with_session(session)
        result = repo.reject_validation_node("val_001", "admin_001")
        assert result is True

    def test_returns_true_even_with_zero_linked_reports(self):
        session = make_session(single_record=make_count_record("updated", 0))
        repo = build_repo_with_session(session)
        result = repo.reject_validation_node("val_001", "admin_001")
        assert result is True  # 0 >= 0 is valid

    def test_query_sets_rejected_and_discarded_status(self):
        session = make_session(single_record=make_count_record("updated", 1))
        repo = build_repo_with_session(session)
        repo.reject_validation_node("val_002", "admin_002")
        query = str(session.run.call_args)
        assert "rejected" in query
        assert "discarded" in query
