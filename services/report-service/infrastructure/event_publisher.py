# infrastructure/event_publisher.py
import requests
from core.config import config


class EventPublisher:
    def __init__(self):
        self.publish_url = f"{config.EVENT_SERVICE_URL}/publish"

    def _publish(self, event_type: str, payload: dict):
        """Internal: POST event to the Go SSE Hub."""
        try:
            requests.post(
                self.publish_url,
                json={"type": event_type, "payload": payload},
                timeout=2,
            )
            print(f"[EventPublisher] Published: {event_type}")
        except requests.exceptions.RequestException as e:
            print(f"[EventPublisher] Warning — failed to publish {event_type}: {e}")

    def publish_approved_node(self, node: dict):
        """
        Broadcasts a new ApprovedNode to ALL connected clients.
        Triggers a large red marker on the user map in real-time.
        """
        self._publish("NEW_APPROVED_NODE", node)

    def publish_validation_update(self, node: dict):
        """
        Broadcasts a created/updated ValidationNode to admin dashboard clients.
        Triggers a yellow marker update on the admin map.
        """
        self._publish("VALIDATION_UPDATED", node)

    def publish_validation_rejected(self, validation_id: str):
        """
        Broadcasts a rejection event so admin dashboards can remove the card.
        """
        self._publish("VALIDATION_REJECTED", {"id": validation_id})
