# domain/models.py
from pydantic import BaseModel
from typing import Optional

class ReportRequest(BaseModel):
    user_id: str = "anonymous"
    description: str
    lat: float
    lng: float

class AdminActionRequest(BaseModel):
    action: str  # "approve" or "reject"
    admin_id: str
    explanation: Optional[str] = ""
