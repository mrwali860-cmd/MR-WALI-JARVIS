"""Deterministic reasoning layer for Empire Brain."""
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True, slots=True)
class ReasoningResult:
    goal: str
    assumptions: tuple[str, ...]
    constraints: tuple[str, ...]
    next_actions: tuple[str, ...]
    confidence: float
    def as_dict(self) -> dict[str, Any]: return {"goal": self.goal, "assumptions": list(self.assumptions), "constraints": list(self.constraints), "next_actions": list(self.next_actions), "confidence": self.confidence}
    def summary(self) -> str:
        actions = "\n".join(f"{i}. {a}" for i,a in enumerate(self.next_actions,1))
        return f"Goal: {self.goal}\nAssumptions: {', '.join(self.assumptions) or 'None'}\nConstraints: {', '.join(self.constraints) or 'None'}\nConfidence: {self.confidence:.2f}\nNext actions:\n{actions}"

class ReasoningEngine:
    @staticmethod
    def _project_search_query(text):
        for prefix in ("search project for ", "search code for ", "search repository for ", "find in project ", "find in code ", "find code "):
            if text.lower().startswith(prefix): return text[len(prefix):].strip()
        return text
    @staticmethod
    def _file_path(text):
        for prefix in ("read file ", "open file ", "show file ", "view file ", "display file "):
            if text.lower().startswith(prefix): return text[len(prefix):].strip()
        return text
    def reason(self, user_input, intent, context, thinking_result):
        text = user_input.strip(); assumptions=[]; constraints=[]
        if context.get("experience") != "UNKNOWN": assumptions.append(f"Experience level is {context['experience']}")
        if context.get("business") != "UNKNOWN": assumptions.append(f"Business type is {context['business']}")
        if context.get("urgency") == "HIGH": constraints.append("High urgency")
        actions=tuple(line.strip()[3:] for line in thinking_result.splitlines() if line.strip()[:2].isdigit() and line.strip()[2:3]==".")
        if intent=="GIT_STATUS": actions=("Check Git status",)
        elif intent=="PROJECT_SEARCH": actions=(f"Search project source files for: {self._project_search_query(text)}",)
        elif intent=="FILE_READ": actions=(f"Read file: {self._file_path(text)}",)
        elif not actions: actions=("Clarify the objective and success criteria", "Choose the smallest executable next step", "Verify the outcome before declaring success")
        return ReasoningResult(text, tuple(assumptions), tuple(constraints), actions, 0.85 if intent!="UNKNOWN" else 0.55)
