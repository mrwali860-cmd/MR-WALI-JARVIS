"""Decision context analyzer."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
@dataclass(slots=True)
class BusinessContext:
    goal: str=""; business_stage: str=""; industry: str=""; available_budget: float=0.0; available_team: int=0; urgency: str="normal"; decision_category: str=""; current_problem: str=""; founder_constraints: list[str]=field(default_factory=list); metadata: dict[str,Any]=field(default_factory=dict)
class ContextAnalyzer:
    def understand(self, raw_context: dict[str,Any]) -> BusinessContext:
        c=BusinessContext(goal=raw_context.get("goal",""),business_stage=raw_context.get("business_stage",""),industry=raw_context.get("industry",""),available_budget=raw_context.get("available_budget",0.0),available_team=raw_context.get("available_team",0),current_problem=raw_context.get("problem",""),founder_constraints=raw_context.get("constraints",[]),metadata=raw_context.get("metadata",{})); c.urgency=self.detect_urgency(c); c.decision_category=self.detect_category(c); return c
    def detect_urgency(self, context: BusinessContext) -> str:
        return "high" if any(x in context.current_problem.lower() for x in ("loss","urgent")) else "normal"
    def detect_category(self, context: BusinessContext) -> str:
        goal=context.goal.lower()
        for word,category in (("growth","growth"),("revenue","revenue"),("profit","profit"),("client","client"),("automation","automation")):
            if word in goal: return category
        return "general"
