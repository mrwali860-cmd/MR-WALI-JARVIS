"""
Empire OS
Acquisition Engine

Lead -> Qualify -> Outreach -> Contact -> Follow-up
"""

from __future__ import annotations

from typing import Any

from .follow_up import FollowUpEngine
from .lead import Lead
from .outreach import OutreachEngine


class AcquisitionEngine:
    """Orchestrate the lead acquisition lifecycle."""

    def __init__(self) -> None:
        self.leads: dict[str, Lead] = {}
        self.outreach = OutreachEngine()
        self.follow_up = FollowUpEngine()

    def create_lead(
        self,
        lead_id: str,
        name: str,
        company: str,
        email: str,
        opportunity: str,
    ) -> dict[str, Any]:

        if not lead_id:
            raise ValueError("Lead ID is required.")

        if lead_id in self.leads:
            return self.leads[lead_id].to_dict()

        lead = Lead(
            id=lead_id,
            name=name,
            company=company,
            email=email,
            opportunity=opportunity,
        )

        self.leads[lead_id] = lead

        return lead.to_dict()

    def get_lead(self, lead_id: str) -> dict[str, Any] | None:
        lead = self.leads.get(lead_id)
        return None if lead is None else lead.to_dict()

    def qualify_lead(self, lead_id: str) -> dict[str, Any]:
        lead = self._require_lead(lead_id)

        qualified = lead.qualify()

        return {
            "lead_id": lead_id,
            "qualified": qualified,
            "score": lead.score,
            "status": lead.status,
        }

    def prepare_outreach(
        self,
        lead_id: str,
        message: str,
    ) -> dict[str, Any]:

        lead = self._require_lead(lead_id)

        if lead.status != "qualified":
            raise ValueError("Lead must be qualified before outreach.")

        return self.outreach.prepare(
            lead_id=lead_id,
            message=message,
        )

    def record_contact(
        self,
        lead_id: str,
    ) -> dict[str, Any]:

        lead = self._require_lead(lead_id)

        lead.contacted = True
        lead.contact_count += 1
        lead.status = "contacted"

        return {
            "lead_id": lead_id,
            "status": lead.status,
            "contact_count": lead.contact_count,
        }

    def schedule_follow_up(
        self,
        lead_id: str,
        days: int = 3,
    ) -> dict[str, Any]:

        lead = self._require_lead(lead_id)

        record = self.follow_up.schedule(
            lead_id=lead_id,
            days=days,
        )

        lead.follow_up_at = record["follow_up_at"]

        return record

    def pipeline_summary(self) -> dict[str, Any]:

        leads = list(self.leads.values())

        return {
            "total_leads": len(leads),
            "new": sum(1 for lead in leads if lead.status == "new"),
            "qualified": sum(
                1 for lead in leads if lead.status == "qualified"
            ),
            "contacted": sum(
                1 for lead in leads if lead.status == "contacted"
            ),
            "unqualified": sum(
                1 for lead in leads if lead.status == "unqualified"
            ),
            "outreach_prepared": len(self.outreach.messages),
            "follow_ups_scheduled": len(self.follow_up.follow_ups),
        }

    def _require_lead(self, lead_id: str) -> Lead:

        lead = self.leads.get(lead_id)

        if lead is None:
            raise ValueError(f"Lead not found: {lead_id}")

        return lead
