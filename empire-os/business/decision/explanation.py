from .models import DecisionResult
class ExplanationEngine:
    def explain(self,result:DecisionResult)->list[str]:
        reasons=[]
        if result.score.roi>=80: reasons.append("High expected return on investment.")
        if result.score.alignment>=80: reasons.append("Strong alignment with founder goals.")
        if result.score.business_impact>=80: reasons.append("High positive impact on business growth.")
        if result.score.risk<=30: reasons.append("Business risk is relatively low.")
        if result.score.execution_time<=30: reasons.append("Can be executed quickly.")
        if result.score.cost<=30: reasons.append("Requires relatively low investment.")
        return reasons or ["Balanced recommendation based on overall business evaluation."]
    def summarize_risk(self,result:DecisionResult)->str:
        r=result.score.risk
        return "Very Low Risk" if r<=20 else "Low Risk" if r<=40 else "Moderate Risk" if r<=60 else "High Risk" if r<=80 else "Critical Risk"
    def success_probability(self,result:DecisionResult)->float: return round((result.score.final_score+result.confidence)/2,2)
