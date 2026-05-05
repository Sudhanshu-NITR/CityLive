# core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))

    # Neo4j
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # External Services
    USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8082")
    EVENT_SERVICE_URL = os.getenv("EVENT_SERVICE_URL", "http://event-service:8081")
    
    # AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

config = Config()