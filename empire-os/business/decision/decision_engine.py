from __future__ import annotations
from dataclasses import asdict
from .context import ContextAnalyzer
from .evaluator import OpportunityEvaluator
from .explanation import ExplanationEngine
from .models import DecisionReport
from .ranking import RankingEngine
from .recommender import RecommendationEngine
class DecisionEngine:
    def __init__(self):
        self.context=ContextAnalyzer(); self.evaluator=OpportunityEvaluator(); self.ranking=RankingEngine(); self.recommender=RecommendationEngine(); self.explainer=ExplanationEngine()
    def recommend(self,raw_context,options):
        context=self.context.understand(raw_context); evaluated=[]
        for option in options:
            result=self.evaluator.evaluate(option=option,roi=option.roi,risk=option.risk,alignment=option.alignment,impact=option.impact,execution_time=option.execution_time,cost=option.cost)
            result.reasons=self.explainer.explain(result); evaluated.append(result)
        ranked=self.ranking.rank(evaluated); recommendation=self.recommender.recommend(ranked)
        if recommendation is None: return None
        return DecisionReport(context=context,recommended=recommendation,alternatives=self.recommender.alternatives(ranked))
