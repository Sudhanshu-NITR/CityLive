# infrastructure/event_publisher.py
import requests
from core.config import config
from domain.models import PulseNode

class EventPublisher:
    def __init__(self):
        self.publish_url = f"{config.EVENT_SERVICE_URL}/publish"

    def publish_new_node(self, node: PulseNode):
        try:
            event_payload = {
                "type": "NEW_PULSE_NODE",
                "payload": node.to_dict()
            }
            requests.post(self.publish_url, json=event_payload, timeout=2)
            print("Successfully published event to broker")
        except requests.exceptions.RequestException as e:
            print(f"Warning: Failed to publish event: {e}")
