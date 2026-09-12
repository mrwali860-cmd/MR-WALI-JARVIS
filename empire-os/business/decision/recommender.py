from .models import DecisionResult
class RecommendationEngine:
    def recommend(self, ranked_results:list[DecisionResult])->DecisionResult|None:
        if not ranked_results: return None
        best=ranked_results[0]; return best if self.is_recommendable(best) else None
    def is_recommendable(self,result:DecisionResult)->bool: return result.confidence>=50 and result.score.risk<=90 and result.score.final_score>=50
    def alternatives(self, ranked_results:list[DecisionResult], limit:int=2)->list[DecisionResult]: return ranked_results[1:limit+1]
