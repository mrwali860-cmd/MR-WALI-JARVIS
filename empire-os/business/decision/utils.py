def normalize_score(value: float, minimum: float, maximum: float) -> float:
    if maximum <= minimum: return 0.0
    return max(0.0, min(100.0, ((value-minimum)/(maximum-minimum))*100))
def clamp(value: float, minimum: float, maximum: float) -> float: return max(minimum, min(value, maximum))
def weighted_score(score: float, weight: float) -> float: return score*weight
def average(values: list[float]) -> float: return sum(values)/len(values) if values else 0.0
def sort_descending(values: list): return sorted(values, reverse=True)
def percentage(part: float, total: float) -> float: return 0.0 if total == 0 else (part/total)*100
def confidence_label(confidence: float) -> str:
    if confidence>=90: return "Very High"
    if confidence>=75: return "High"
    if confidence>=60: return "Medium"
    if confidence>=40: return "Low"
    return "Very Low"
def safe_divide(numerator: float, denominator: float) -> float: return 0.0 if denominator==0 else numerator/denominator
