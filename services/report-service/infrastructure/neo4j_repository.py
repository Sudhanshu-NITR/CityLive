# infrastructure/neo4j_repository.py
import uuid
from typing import List, Dict, Optional
from infrastructure.database import db


class Neo4jRepository:
    def __init__(self):
        self.driver = db.get_driver()

    # ─────────────────────────────────────────────
    # ReportNode
    # ─────────────────────────────────────────────

    def create_report_node(
        self, report_id: str, user_id: str, description: str,
        lat: float, lng: float
    ) -> Dict:
        """Creates a raw :ReportNode and links it to a :User node."""
        query = """
        MERGE (u:User {id: $user_id})
        CREATE (r:ReportNode {
            id:          $id,
            description: $description,
            lat:         $lat,
            lng:         $lng,
            user_id:     $user_id,
            status:      'pending',
            timestamp:   datetime()
        })
        CREATE (u)-[:SUBMITTED]->(r)
        RETURN r { .* } AS report
        """
        with self.driver.session() as session:
            result = session.run(
                query, id=report_id, user_id=user_id,
                description=description, lat=lat, lng=lng
            )
            return dict(result.single()["report"])

    def check_recent_user_report(self, user_id: str, lat: float, lng: float) -> bool:
        """Returns True if user submitted a report within 500 m in the last hour (anti-spam)."""
        query = """
        MATCH (u:User {id: $user_id})-[:SUBMITTED]->(r:ReportNode)
        WITH r,
             point({latitude: r.lat, longitude: r.lng}) AS p1,
             point({latitude: $lat, longitude: $lng})   AS p2
        WHERE distance(p1, p2) < 500
          AND r.timestamp > datetime() - duration({hours: 1})
        RETURN count(r) AS cnt
        """
        with self.driver.session() as session:
            result = session.run(query, user_id=user_id, lat=lat, lng=lng)
            return result.single()["cnt"] > 0

    def mark_report_discarded(self, report_id: str):
        """Marks a ReportNode as discarded by the AI."""
        query = "MATCH (r:ReportNode {id: $id}) SET r.status = 'discarded'"
        with self.driver.session() as session:
            session.run(query, id=report_id)

    def mark_report_clustered(self, report_id: str):
        """Marks a ReportNode as successfully clustered into a ValidationNode."""
        query = "MATCH (r:ReportNode {id: $id}) SET r.status = 'clustered'"
        with self.driver.session() as session:
            session.run(query, id=report_id)

    # ─────────────────────────────────────────────
    # Context Fetch (used as AI Tool)
    # ─────────────────────────────────────────────

    def get_nearby_context(self, lat: float, lng: float, radius_km: float = 1.0) -> Dict:
        """
        Fetches all ApprovedNodes, ValidationNodes, and ReportNodes within
        the given radius. Used by the Sentinel Agent as a context tool.
        """
        query = """
        MATCH (n)
        WHERE (n:ApprovedNode OR n:ValidationNode OR n:ReportNode)
          AND (n:ApprovedNode AND n.is_active = true
               OR n:ValidationNode
               OR n:ReportNode)
        WITH n,
             labels(n)[0]                               AS node_type,
             point({latitude: n.lat, longitude: n.lng}) AS p1,
             point({latitude: $lat, longitude: $lng})   AS p2
        WHERE distance(p1, p2) < ($radius_km * 1000)
        RETURN node_type, n { .* } AS data
        ORDER BY distance(p1, p2)
        LIMIT 25
        """
        context = {"approved_nodes": [], "validation_nodes": [], "report_nodes": []}
        with self.driver.session() as session:
            result = session.run(query, lat=lat, lng=lng, radius_km=radius_km)
            for record in result:
                node_type = record["node_type"]
                data = dict(record["data"])
                if node_type == "ApprovedNode":
                    context["approved_nodes"].append(data)
                elif node_type == "ValidationNode":
                    context["validation_nodes"].append(data)
                else:
                    context["report_nodes"].append(data)
        return context

    # ─────────────────────────────────────────────
    # ValidationNode (AI Tools)
    # ─────────────────────────────────────────────

    def create_validation_node(
        self, report_id: str, lat: float, lng: float,
        hazard_type: str, title: str, ai_explanation: str,
        severity: int, priority: int
    ) -> Dict:
        """
        Creates a new :ValidationNode and links the triggering :ReportNode to it.
        Called by the Sentinel Agent tool.
        """
        validation_id = f"val_{uuid.uuid4().hex[:10]}"
        query = """
        MATCH (r:ReportNode {id: $report_id})
        CREATE (v:ValidationNode {
            id:             $id,
            hazard_type:    $hazard_type,
            title:          $title,
            ai_explanation: $ai_explanation,
            severity:       $severity,
            priority:       $priority,
            report_count:   1,
            lat:            $lat,
            lng:            $lng,
            status:         'pending_admin_review',
            created_at:     datetime(),
            updated_at:     datetime()
        })
        CREATE (r)-[:PART_OF]->(v)
        SET r.status = 'clustered'
        RETURN v { .* } AS validation
        """
        with self.driver.session() as session:
            result = session.run(
                query, id=validation_id, report_id=report_id,
                lat=lat, lng=lng, hazard_type=hazard_type,
                title=title, ai_explanation=ai_explanation,
                severity=severity, priority=priority
            )
            return dict(result.single()["validation"])

    def update_validation_node(
        self, validation_id: str, report_id: str,
        new_severity: int, new_priority: int, updated_explanation: str
    ) -> Dict:
        """
        Updates an existing :ValidationNode (severity, priority, explanation,
        report_count) and links the new :ReportNode to it.
        Called by the Sentinel Agent tool.
        """
        query = """
        MATCH (v:ValidationNode {id: $id})
        MATCH (r:ReportNode {id: $report_id})
        SET v.severity       = $severity,
            v.priority       = $priority,
            v.ai_explanation = $explanation,
            v.report_count   = v.report_count + 1,
            v.updated_at     = datetime()
        MERGE (r)-[:PART_OF]->(v)
        SET r.status = 'clustered'
        RETURN v { .* } AS validation
        """
        with self.driver.session() as session:
            result = session.run(
                query, id=validation_id, report_id=report_id,
                severity=new_severity, priority=new_priority,
                explanation=updated_explanation
            )
            record = result.single()
            return dict(record["validation"]) if record else {}

    def get_all_validation_nodes(self) -> List[Dict]:
        """
        Returns all pending ValidationNodes ordered by severity desc, priority desc.
        Used by the admin dashboard.
        """
        query = """
        MATCH (v:ValidationNode)
        WHERE v.status = 'pending_admin_review'
        OPTIONAL MATCH (r:ReportNode)-[:PART_OF]->(v)
        WITH v, collect(r { .id, .description, .lat, .lng, .user_id, .timestamp }) AS reports
        RETURN v { .*, linked_reports: reports } AS validation
        ORDER BY v.severity DESC, v.priority DESC
        """
        with self.driver.session() as session:
            result = session.run(query)
            return [dict(r["validation"]) for r in result]

    def get_reports_for_validation(self, validation_id: str) -> List[Dict]:
        """Returns all ReportNodes linked to a given ValidationNode."""
        query = """
        MATCH (r:ReportNode)-[:PART_OF]->(v:ValidationNode {id: $id})
        RETURN r { .* } AS report
        ORDER BY r.timestamp DESC
        """
        with self.driver.session() as session:
            result = session.run(query, id=validation_id)
            return [dict(r["report"]) for r in result]

    # ─────────────────────────────────────────────
    # ApprovedNode (Admin + AI Tools)
    # ─────────────────────────────────────────────

    def create_approved_node(
        self, validation_id: str, admin_id: str,
        admin_explanation: str, ai_post_approval_notes: str = ""
    ) -> Optional[Dict]:
        """
        Creates an :ApprovedNode linked to the :ValidationNode.
        Sets the ValidationNode status to 'approved'.
        Called during admin approval flow.
        """
        approved_id = f"appr_{uuid.uuid4().hex[:10]}"
        query = """
        MATCH (v:ValidationNode {id: $validation_id})
        CREATE (a:ApprovedNode {
            id:                    $approved_id,
            validation_node_id:    $validation_id,
            admin_id:              $admin_id,
            admin_explanation:     $admin_explanation,
            ai_post_approval_notes: $ai_notes,
            hazard_type:           v.hazard_type,
            title:                 v.title,
            severity:              v.severity,
            lat:                   v.lat,
            lng:                   v.lng,
            is_active:             true,
            approved_at:           datetime()
        })
        CREATE (a)-[:VALIDATES]->(v)
        SET v.status = 'approved'
        RETURN a { .* } AS approved
        """
        with self.driver.session() as session:
            result = session.run(
                query, validation_id=validation_id,
                approved_id=approved_id, admin_id=admin_id,
                admin_explanation=admin_explanation,
                ai_notes=ai_post_approval_notes
            )
            record = result.single()
            return dict(record["approved"]) if record else None

    def reject_validation_node(self, validation_id: str, admin_id: str) -> bool:
        """Marks a ValidationNode as rejected and its linked reports as discarded."""
        query = """
        MATCH (v:ValidationNode {id: $id})
        SET v.status = 'rejected', v.rejected_by = $admin_id, v.rejected_at = datetime()
        WITH v
        MATCH (r:ReportNode)-[:PART_OF]->(v)
        SET r.status = 'discarded'
        RETURN count(r) AS updated
        """
        with self.driver.session() as session:
            result = session.run(query, id=validation_id, admin_id=admin_id)
            return result.single()["updated"] >= 0

    def get_all_approved_nodes(self) -> List[Dict]:
        """
        Returns all active ApprovedNodes for the user-facing map initial load.
        """
        query = """
        MATCH (a:ApprovedNode {is_active: true})
        RETURN a { .* } AS approved
        ORDER BY a.approved_at DESC
        """
        with self.driver.session() as session:
            result = session.run(query)
            return [dict(r["approved"]) for r in result]

    def get_context_nodes(self) -> List[Dict]:
        """Returns active ApprovedNodes for AI insight generation."""
        return self.get_all_approved_nodes()
