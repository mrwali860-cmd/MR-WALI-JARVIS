"""Empire Brain processing pipeline snapshot imported from Empire-OS."""

from .context import ContextAnalyzer
from .decisions import DecisionEngine
from .intent import IntentDetector
from .llm import LLMClient, LLMConfigError, LLMProviderError
from .planner import ExecutionPlanner
from .response import ResponseBuilder
from .thinking import BusinessThinking
from .reasoning import ReasoningEngine, ReasoningVerifier, ReasoningResult


class BrainPipeline:
    """Process requests through reasoning, planning, and deterministic fallback."""

    def __init__(self, llm=None, intent_llm=None, orchestrator=None):
        self.llm = llm or LLMClient()
        self.intent = IntentDetector(llm=intent_llm or self.llm)
        self.context = ContextAnalyzer()
        self.thinking = BusinessThinking()
        self.reasoning = ReasoningEngine()
        self.verifier = ReasoningVerifier()
        self.decision = DecisionEngine()
        self.planner = ExecutionPlanner()
        self.orchestrator = orchestrator
        self.response = ResponseBuilder()

    def _reason(self, user_input, intent, context, thinking_result):
        payload = {"user_input": user_input, "intent": intent, "context": context, "current_strategy": thinking_result}
        try:
            llm_output = self.llm.reason(payload)
            result = ReasoningResult(goal=str(llm_output.get("goal", user_input.strip())), assumptions=tuple(str(x) for x in llm_output.get("assumptions", [])), constraints=tuple(str(x) for x in llm_output.get("constraints", [])), next_actions=tuple(str(x) for x in llm_output.get("next_actions", [])), confidence=float(llm_output.get("confidence", 0.0)))
            check = self.verifier.verify(result.as_dict())
            if check["verified"]:
                return result
        except (LLMConfigError, LLMProviderError, ValueError, TypeError, KeyError, AttributeError):
            pass
        return self.reasoning.reason(user_input=user_input, intent=intent, context=context, thinking_result=thinking_result)

    def process(self, user_input):
        if not isinstance(user_input, str):
            raise TypeError("User input must be a string.")
        if not user_input.strip():
            raise ValueError("User input must not be empty.")
        intent = self.intent.detect(user_input)
        context = self.context.analyze(user_input)
        thinking_result = self.thinking.think(intent, context)
        reasoning_result = self._reason(user_input, intent, context, thinking_result)
        reasoning_dict = reasoning_result.as_dict()
        reasoning_check = self.verifier.verify(reasoning_dict)
        if not reasoning_check["verified"]:
            return "Reasoning verification failed: " + reasoning_check["reason"]
        decision = self.decision.decide(reasoning_result.summary())
        plan = self.planner.plan(decision)
        return self.response.build(plan, context)
