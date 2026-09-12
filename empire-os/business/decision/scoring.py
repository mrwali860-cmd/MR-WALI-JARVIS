from .constants import ALIGNMENT_WEIGHT,BUSINESS_IMPACT_WEIGHT,COST_WEIGHT,RISK_WEIGHT,ROI_WEIGHT,TIME_WEIGHT
from .utils import clamp,weighted_score
class BusinessScoringEngine:
    def calculate_final_score(self, *, roi:float,risk:float,alignment:float,impact:float,execution_time:float,cost:float)->float:
        roi,risk,alignment,impact,execution_time,cost=[clamp(v,0,100) for v in (roi,risk,alignment,impact,execution_time,cost)]
        score=weighted_score(roi,ROI_WEIGHT)+weighted_score(alignment,ALIGNMENT_WEIGHT)+weighted_score(impact,BUSINESS_IMPACT_WEIGHT)-weighted_score(risk,RISK_WEIGHT)-weighted_score(execution_time,TIME_WEIGHT)-weighted_score(cost,COST_WEIGHT)
        return round(clamp(score,0,100),2)
