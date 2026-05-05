# infrastructure/database.py
from neo4j import GraphDatabase
from core.config import config

class Database:
    def __init__(self):
        self._driver = None

    def connect(self):
        if not self._driver:
            self._driver = GraphDatabase.driver(
                config.NEO4J_URI,
                auth=(config.NEO4J_USERNAME, config.NEO4J_PASSWORD)
            )

    def close(self):
        if self._driver:
            self._driver.close()
    
    def get_driver(self):
        return self._driver

db = Database()