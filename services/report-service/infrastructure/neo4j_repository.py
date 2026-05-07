# infrastructure/neo4j_repository.py
from typing import List, Dict
from domain.models import PulseNode
from infrastructure.database import db

class Neo4jRepository:
    def __init__(self):
        self.driver = db.get_driver()

    def create_report(self, report_id: str, user_id: str, description: str, lat: float, lng: float) -> Dict:
        """Saves a raw citizen report to the graph."""
        cypher_query = """
        MERGE (u:User {id: $user_id})
        CREATE (r:Report {
            id: $id, 
            description: $description, 
            lat: $lat, 
            lng: $lng, 
            time: datetime()
        })
        CREATE (u)-[:SUBMITTED]->(r)
        RETURN r
        """
        with self.driver.session() as session:
            result = session.run(cypher_query, id=report_id, user_id=user_id, description=description, lat=lat, lng=lng)
            return dict(result.single()["r"])

    def get_nearby_context(self, lat: float, lng: float, radius_km: float = 1.0) -> Dict:
        """Fetches nearby analyzed incidents and raw reports for context."""
        cypher_query = """
        MATCH (n)
        WHERE (n:AnalyzedIncident OR n:Report)
        WITH n, point({latitude: n.lat, longitude: n.lng}) as p1, 
             point({latitude: $lat, longitude: $lng}) as p2
        WHERE distance(p1, p2) < ($radius_km * 1000)
        RETURN labels(n)[0] as type, n.id as id, n.title as title, 
               n.description as description, n.severity as severity, n.is_verified as is_verified
        LIMIT 10
        """
        context = {"incidents": [], "reports": []}
        with self.driver.session() as session:
            result = session.run(cypher_query, lat=lat, lng=lng, radius_km=radius_km)
            for record in result:
                if record["type"] == "AnalyzedIncident":
                    context["incidents"].append(dict(record))
                else:
                    context["reports"].append(dict(record))
        return context

    def upsert_incident(self, incident_id: str, lat: float, lng: float, 
                        incident_type: str, title: str, description: str, 
                        severity: int, priority: int, report_id: str) -> Dict:
        """AI tool to create or update an AnalyzedIncident and link a report to it."""
        cypher_query = """
        MERGE (i:AnalyzedIncident {id: $id})
        ON CREATE SET 
            i.lat = $lat, i.lng = $lng, i.type = $type, 
            i.title = $title, i.description = $description,
            i.severity = $severity, i.priority = $priority,
            i.is_verified = false, i.status = 'pending_verification'
        ON MATCH SET
            i.severity = $severity, i.priority = $priority,
            i.description = i.description + " | " + $description
        WITH i
        MATCH (r:Report {id: $report_id})
        MERGE (r)-[:PART_OF]->(i)
        RETURN i
        """
        with self.driver.session() as session:
            result = session.run(cypher_query, 
                                 id=incident_id, lat=lat, lng=lng, type=incident_type,
                                 title=title, description=description, 
                                 severity=severity, priority=priority, report_id=report_id)
            return dict(result.single()["i"])

    def get_all_incidents(self) -> List[Dict]:
        """Returns all AnalyzedIncidents (both pending and verified) for the map."""
        cypher_query = "MATCH (n:AnalyzedIncident) RETURN n"
        incidents = []
        with self.driver.session() as session:
            result = session.run(cypher_query)
            for record in result:
                incidents.append(dict(record["n"]))
        return incidents

    def verify_incident(self, incident_id: str) -> Dict:
        """Admin tool to transition an AnalyzedIncident to a Verified Node status."""
        cypher_query = """
        MATCH (i:AnalyzedIncident {id: $id})
        SET i.is_verified = true, i.status = 'active'
        RETURN i
        """
        with self.driver.session() as session:
            result = session.run(cypher_query, id=incident_id)
            record = result.single()
            return dict(record["i"]) if record else None
