# domain/models.py
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class ReportRequest:
    user_id: str
    description: str
    location_title: str
    lat: float
    lng: float

@dataclass
class PulseNode:
    id: str
    type: str
    title: str
    description: str
    lat: float
    lng: float
    color: str
    bg: str
    time: str = "Just now"

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "description": self.description,
            "lat": self.lat,
            "lng": self.lng,
            "color": self.color,
            "bg": self.bg,
            "time": self.time
        }
