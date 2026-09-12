"""Provider-neutral LLM client imported from Empire-OS."""
from __future__ import annotations
import json, os
from typing import Any

class LLMConfigError(RuntimeError): pass
class LLMProviderError(LLMConfigError): pass

class LLMClient:
    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("EMPIRE_LLM_MODEL", "gpt-5.6-luna")
        self.api_key = os.getenv("OPENAI_API_KEY")
    def available(self): return bool(self.api_key)
    def _request_json(self, *, instructions: str, payload: Any):
        if not self.api_key: raise LLMConfigError("OPENAI_API_KEY is not configured; using deterministic fallback.")
        try:
            from openai import OpenAI
        except ImportError as exc: raise LLMConfigError("The openai package is not installed.") from exc
        try:
            response = OpenAI(api_key=self.api_key).responses.create(model=self.model, instructions=instructions, input=json.dumps(payload, ensure_ascii=False))
        except Exception as exc: raise LLMProviderError(f"LLM provider request failed: {exc}") from exc
        try: result = json.loads(response.output_text.strip())
        except (json.JSONDecodeError, AttributeError) as exc: raise LLMProviderError("LLM returned non-JSON output.") from exc
        if not isinstance(result, dict): raise LLMProviderError("LLM output must be a JSON object.")
        return result
    def reason(self, payload):
        return self._request_json(instructions="Analyze the objective and return JSON keys goal, assumptions, constraints, next_actions, confidence. Do not claim execution.", payload=payload)
    def classify_intent(self, user_input):
        return self._request_json(instructions="Classify intent as CLIENT_ACQUISITION, REVENUE_GROWTH, SYSTEM_BUILDING, MARKETING, HIRING, UNKNOWN. Return intent and confidence as JSON.", payload={"user_input": user_input})
