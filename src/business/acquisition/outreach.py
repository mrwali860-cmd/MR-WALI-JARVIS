"""
Empire OS
Outreach Engine
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class OutreachEngine:
    """Prepare and track lead outreach."""

    def __init__(self) -> None:
        self.messages: dict[str, dict[str, Any]] = {}

    def prepare(
        self,
        lead_id: str,
        message: str,
    ) -> dict[str, Any]:

        if not lead_id:
            raise ValueError("Lead ID is required.")

        if not message.strip():
            raise ValueError("Outreach message is required.")

        record = {
            "lead_id": lead_id,
            "message": message,
            "status": "prepared",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        self.messages[lead_id] = record

        return record

    def get(self, lead_id: str) -> dict[str, Any] | None:
        return self.messages.get(lead_id)

    def mark_sent(self, lead_id: str) -> bool:
        record = self.messages.get(lead_id)

        if record is None:
            return False

        record["status"] = "sent"
        record["sent_at"] = datetime.now(timezone.utc).isoformat()

        return True
