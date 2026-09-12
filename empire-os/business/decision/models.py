"""Decision Engine data models."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
@dataclass(slots=True)
class BusinessGoal:
    name: str; priority: int = 100; description: str = ""
@dataclass(slots=True)
class DecisionContext:
    business_id: str; founder_id: str; goal: BusinessGoal; available_budget: float = 0.0; available_team: int = 0; metadata: dict[str, Any] = field(default_factory=dict); created_at: datetime = field(default_factory=datetime.utcnow)
@dataclass(slots=True)
class DecisionOption:
    id: str; title: str; description: str = ""; roi: float = 0.0; risk: float = 0.0; alignment: float = 0.0; impact: float = 0.0; execution_time: float = 0.0; cost: float = 0.0
@dataclass(slots=True)
class DecisionScore:
    roi: float = 0.0; risk: float = 0.0; cost: float = 0.0; execution_time: float = 0.0; complexity: float = 0.0; alignment: float = 0.0; business_impact: float = 0.0; final_score: float = 0.0
@dataclass(slots=True)
class DecisionResult:
    option: DecisionOption; score: DecisionScore; confidence: float = 0.0; reasons: list[str] = field(default_factory=list); risks: list[str] = field(default_factory=list); expected_results: list[str] = field(default_factory=list)
@dataclass(slots=True)
class DecisionReport:
    context: DecisionContext; recommended: DecisionResult; alternatives: list[DecisionResult] = field(default_factory=list); generated_at: datetime = field(default_factory=datetime.utcnow)
