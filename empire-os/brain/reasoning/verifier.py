class ReasoningVerifier:
    REQUIRED_FIELDS=("goal","next_actions","confidence")
    def verify(self,result):
        missing=[f for f in self.REQUIRED_FIELDS if f not in result]
        actions=result.get("next_actions"); confidence=result.get("confidence")
        if missing: return {"verified":False,"reason":f"Missing fields: {', '.join(missing)}"}
        if not isinstance(actions,list) or not actions: return {"verified":False,"reason":"Reasoning produced no executable next actions."}
        if not isinstance(confidence,(int,float)) or not 0.0<=confidence<=1.0: return {"verified":False,"reason":"Confidence must be between 0.0 and 1.0."}
        return {"verified":True,"reason":"Reasoning structure is valid."}
