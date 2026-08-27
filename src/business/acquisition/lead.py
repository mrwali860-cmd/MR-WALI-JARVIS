"""
Empire OS
Lead Model
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class Lead:
    """Represent a sales lead."""

    id: str
    name: str
    company: str
    email: str
    opportunity: str
    status: str = "new"
    score: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    contacted: bool = False
    contact_count: int = 0
    follow_up_at: str | None = None

    def qualify(self) -> bool:
        """Qualify the lead using basic completeness rules."""

        self.score = 0.0

        if self.name.strip():
            self.score += 20.0

        if self.company.strip():
            self.score += 20.0

        if self.email.strip() and "@" in self.email:
            self.score += 30.0

        if self.opportunity.strip():
            self.score += 30.0

        qualified = self.score >= 70.0
        self.status = "qualified" if qualified else "unqualified"

        return qualified

    def to_dict(self) -> dict[str, Any]:
        """Return the lead as a dictionary."""

        return {
            "id": self.id,
            "name": self.name,
            "company": self.company,
            "email": self.email,
            "opportunity": self.opportunity,
            "status": self.status,
            "score": self.score,
            "created_at": self.created_at,
            "contacted": self.contacted,
            "contact_count": self.contact_count,
            "follow_up_at": self.follow_up_at,
        }
