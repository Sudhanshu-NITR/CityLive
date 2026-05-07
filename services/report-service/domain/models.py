# domain/models.py
from pydantic import BaseModel

class ReportRequest(BaseModel):
    user_id: str = "anonymous"
    description: str
    title: str = "Unknown"  
    lat: float
    lng: float

# PulseNode can remain a dataclass or become a BaseModel
class PulseNode(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    description: str
    lat: float
    lng: float
    color: str
    bg: str
    is_verified: bool = False
    time: str = "Just now"
