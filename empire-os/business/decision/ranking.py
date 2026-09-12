from .models import DecisionResult
class RankingEngine:
    def rank(self, results:list[DecisionResult])->list[DecisionResult]: return sorted(results,key=lambda r:r.score.final_score,reverse=True)
    def best(self, results:list[DecisionResult])->DecisionResult|None:
        ranked=self.rank(results); return ranked[0] if ranked else None
    def top(self, results:list[DecisionResult], limit:int=3)->list[DecisionResult]: return self.rank(results)[:limit]
