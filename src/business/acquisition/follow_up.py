"""
Empire OS
Follow-up Engine
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


class FollowUpEngine:
    """Schedule and track lead follow-ups."""

    def __init__(self) -> None:
        self.follow_ups: dict[str, dict[str, Any]] = {}

    def schedule(
        self,
        lead_id: str,
        days: int = 3,
    ) -> dict[str, Any]:

        if not lead_id:
            raise ValueError("Lead ID is required.")

        if days < 1:
            raise ValueError("Days must be greater than zero.")

        now = datetime.now(timezone.utc)
        follow_up_at = now + timedelta(days=days)

        record = {
            "lead_id": lead_id,
            "status": "scheduled",
            "scheduled_at": now.isoformat(),
            "follow_up_at": follow_up_at.isoformat(),
            "days": days,
        }

        self.follow_ups[lead_id] = record

        return record

    def get(self, lead_id: str) -> dict[str, Any] | None:
        return self.follow_ups.get(lead_id)

    def mark_completed(self, lead_id: str) -> bool:
        record = self.follow_ups.get(lead_id)

        if record is None:
            return False

        record["status"] = "completed"
        record["completed_at"] = datetime.now(timezone.utc).isoformat()

        return True
