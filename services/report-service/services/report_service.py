# services/report_service.py
import uuid
from typing import Dict, Tuple, List
from domain.models import ReportRequest, AdminActionRequest
from infrastructure.neo4j_repository import Neo4jRepository
from infrastructure.user_client import UserClient
from infrastructure.event_publisher import EventPublisher
from services.ai_service import AiService


class ReportService:
    def __init__(
        self,
        ai_service: AiService,
        repository: Neo4jRepository,
        user_client: UserClient,
        event_publisher: EventPublisher,
    ):
        self.ai_service = ai_service
        self.repository = repository
        self.user_client = user_client
        self.event_publisher = event_publisher

    # ─────────────────────────────────────────────────────────────────────
    # USER: Submit a new report
    # ─────────────────────────────────────────────────────────────────────

    def process_new_report(self, request: ReportRequest) -> Tuple[Dict, int]:
        # 1. Anti-spam check
        if request.user_id != "anonymous":
            is_spam = self.repository.check_recent_user_report(
                request.user_id, request.lat, request.lng
            )
            if is_spam:
                return {
                    "status": "rejected",
                    "message": "You already submitted a report for this area recently.",
                }, 429

        # 2. Persist the ReportNode
        report_id = f"rep_{uuid.uuid4().hex[:10]}"
        self.repository.create_report_node(
            report_id=report_id,
            user_id=request.user_id,
            description=request.description,
            lat=request.lat,
            lng=request.lng,
        )

        # 3. Sentinel Agent — autonomous triage via function calling
        analysis = self.ai_service.analyze_report(
            report_id=report_id,
            description=request.description,
            lat=request.lat,
            lng=request.lng,
        )

        if not analysis.get("is_valid"):
            # AI discarded the report — penalize if it's clearly invalid
            if analysis.get("action") == "discard" and "not a valid" in analysis.get("reason", "").lower():
                self.user_client.adjust_score(request.user_id, -10, "Report flagged as invalid by Sentinel")
            self.repository.mark_report_discarded(report_id)
            return {
                "status": "discarded",
                "message": analysis.get("reason", "Report discarded by Sentinel Agent."),
            }, 200  # 200 not 400 — user is informed, not errored

        # 4. Reward citizen for valid report
        self.user_client.adjust_score(request.user_id, 10, "Valid report processed by Sentinel")

        # 5. Broadcast ValidationNode update to admin dashboard via SSE
        action = analysis.get("action", "processed")
        if analysis.get("validation_id") and action in ("created_validation", "updated_validation"):
            # Fetch the latest state of the ValidationNode to broadcast
            nodes = self.repository.get_all_validation_nodes()
            target = next((n for n in nodes if n.get("id") == analysis["validation_id"]), None)
            if target:
                self.event_publisher.publish_validation_update(target)

        return {
            "status": "success",
            "message": "Report received and analyzed by Sentinel Agent.",
            "action": action,
            "validation_id": analysis.get("validation_id"),
        }, 201

    # ─────────────────────────────────────────────────────────────────────
    # USER MAP: Fetch initial approved nodes
    # ─────────────────────────────────────────────────────────────────────

    def get_approved_nodes(self) -> List[Dict]:
        return self.repository.get_all_approved_nodes()

    # ─────────────────────────────────────────────────────────────────────
    # ADMIN: Fetch validation queue
    # ─────────────────────────────────────────────────────────────────────

    def get_validation_nodes(self) -> List[Dict]:
        """Returns all pending ValidationNodes with linked reports, sorted by severity + priority."""
        return self.repository.get_all_validation_nodes()

    def get_reports_for_validation(self, validation_id: str) -> List[Dict]:
        return self.repository.get_reports_for_validation(validation_id)

    # ─────────────────────────────────────────────────────────────────────
    # ADMIN: Approve or Reject a ValidationNode
    # ─────────────────────────────────────────────────────────────────────

    def handle_admin_action(self, validation_id: str, action_req: AdminActionRequest) -> Tuple[Dict, int]:
        if action_req.action == "approve":
            return self._approve_validation(validation_id, action_req)
        elif action_req.action == "reject":
            return self._reject_validation(validation_id, action_req)
        else:
            return {"status": "error", "message": f"Unknown action: {action_req.action}"}, 400

    def _approve_validation(self, validation_id: str, req: AdminActionRequest) -> Tuple[Dict, int]:
        # Fetch ValidationNode data for the Approval Agent
        all_validations = self.repository.get_all_validation_nodes()
        validation_data = next((v for v in all_validations if v.get("id") == validation_id), None)

        if not validation_data:
            # May already be approved — try fetching from graph differently
            return {"status": "error", "message": "ValidationNode not found or already processed."}, 404

        # Approval Agent creates ApprovedNode via tool call
        result = self.ai_service.process_approval(
            validation_id=validation_id,
            admin_id=req.admin_id,
            admin_explanation=req.explanation,
            validation_data=validation_data,
        )

        if not result.get("success"):
            return {"status": "error", "message": "Approval agent failed."}, 500

        # Fetch the newly created ApprovedNode and broadcast it
        approved_nodes = self.repository.get_all_approved_nodes()
        new_node = next(
            (n for n in approved_nodes if n.get("validation_node_id") == validation_id), None
        )
        if new_node:
            self.event_publisher.publish_approved_node(new_node)

        return {
            "status": "approved",
            "message": "ValidationNode approved. ApprovedNode is now live on the map.",
            "approved_id": result.get("approved_id"),
        }, 200

    def _reject_validation(self, validation_id: str, req: AdminActionRequest) -> Tuple[Dict, int]:
        success = self.repository.reject_validation_node(validation_id, req.admin_id)
        if not success:
            return {"status": "error", "message": "ValidationNode not found."}, 404

        # Broadcast rejection so admin dashboard removes the card
        self.event_publisher.publish_validation_rejected(validation_id)

        return {
            "status": "rejected",
            "message": "ValidationNode rejected. Linked reports discarded.",
        }, 200

    # ─────────────────────────────────────────────────────────────────────
    # AI Insights
    # ─────────────────────────────────────────────────────────────────────

    def get_predictive_insights(self) -> Tuple[List[Dict], int]:
        context_nodes = self.repository.get_context_nodes()
        insights = self.ai_service.generate_insights(context_nodes)
        return insights, 200
