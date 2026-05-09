# tests/conftest.py
"""
Shared pytest fixtures for report-service tests.
All external dependencies (Neo4j driver, Gemini client) are mocked
so tests run fully offline without any real infrastructure.
"""
import pytest
from unittest.mock import MagicMock, patch


# ── Neo4j driver mock ───────────────────────────────────────────────────────

def make_session_mock(records=None):
    """Return a mock neo4j session whose run() yields given records."""
    records = records or []
    session_mock = MagicMock()
    result_mock = MagicMock()
    result_mock.__iter__ = MagicMock(return_value=iter(records))
    result_mock.single = MagicMock(return_value=records[0] if records else None)
    session_mock.run = MagicMock(return_value=result_mock)
    session_mock.__enter__ = MagicMock(return_value=session_mock)
    session_mock.__exit__ = MagicMock(return_value=False)
    return session_mock


@pytest.fixture
def mock_driver():
    """A Neo4j driver whose session() is a context manager returning mock session."""
    driver = MagicMock()
    return driver


@pytest.fixture
def mock_db(mock_driver):
    """Patch infrastructure.database.db so Neo4jRepository gets mock_driver."""
    with patch("infrastructure.database.db") as db_mock:
        db_mock.get_driver.return_value = mock_driver
        yield db_mock, mock_driver


# ── Repository fixture ──────────────────────────────────────────────────────

@pytest.fixture
def repo(mock_db):
    """Return a Neo4jRepository wired to the mock driver."""
    from infrastructure.neo4j_repository import Neo4jRepository
    return Neo4jRepository()


# ── AI Service fixtures ─────────────────────────────────────────────────────

@pytest.fixture
def mock_repo():
    """A fully mocked Neo4jRepository."""
    return MagicMock()


@pytest.fixture
def ai_service(mock_repo):
    """AiService with mocked Gemini client and repository."""
    with patch("services.ai_service.genai") as mock_genai:
        from services.ai_service import AiService
        svc = AiService(repository=mock_repo)
        svc._mock_genai = mock_genai
        yield svc


# ── ReportService fixtures ──────────────────────────────────────────────────

@pytest.fixture
def full_service():
    """ReportService with ALL dependencies mocked."""
    mock_ai = MagicMock()
    mock_repository = MagicMock()
    mock_user_client = MagicMock()
    mock_publisher = MagicMock()

    from services.report_service import ReportService
    svc = ReportService(mock_ai, mock_repository, mock_user_client, mock_publisher)
    svc._mock_ai = mock_ai
    svc._mock_repo = mock_repository
    svc._mock_user_client = mock_user_client
    svc._mock_publisher = mock_publisher
    return svc


# ── FastAPI TestClient fixture ──────────────────────────────────────────────

@pytest.fixture
def client():
    """FastAPI TestClient with all service dependencies mocked."""
    from fastapi.testclient import TestClient
    from app import app
    from api.routes import get_report_service

    mock_svc = MagicMock()
    app.dependency_overrides[get_report_service] = lambda: mock_svc

    with TestClient(app, raise_server_exceptions=False) as c:
        c.mock_svc = mock_svc
        yield c

    app.dependency_overrides.clear()
