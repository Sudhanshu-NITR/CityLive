# infrastructure/neo4j_repository.py
from typing import List, Dict
from domain.models import PulseNode
from infrastructure.database import db

class Neo4jRepository:
    def __init__(self):
        self.driver = db.get_driver()

    def create_pulse_node(self, node: PulseNode) -> PulseNode:
        cypher_query = """
        CREATE (n:PulseNode {
            id: $id, type: $type, title: $title, description: $description,
            lat: $lat, lng: $lng, color: $color, bg: $bg, time: $time
        })
        RETURN n
        """
        with self.driver.session() as session:
            result = session.run(cypher_query, **node.model_dump())
            record = result.single()
            if record:
                # We could map it back, but we already have the node object
                return node
        return None

    def get_all_nodes(self) -> List[Dict]:
        cypher_query = "MATCH (n:PulseNode) RETURN n"
        nodes = []
        with self.driver.session() as session:
            result = session.run(cypher_query)
            for record in result:
                nodes.append(dict(record["n"]))
        return nodes

    def get_context_nodes(self, limit: int = 20) -> List[Dict]:
        cypher_query = "MATCH (n:PulseNode) RETURN n.type as type, n.title as title, n.description as description LIMIT $limit"
        nodes = []
        with self.driver.session() as session:
            result = session.run(cypher_query, limit=limit)
            for record in result:
                nodes.append(dict(record))
        return nodes
