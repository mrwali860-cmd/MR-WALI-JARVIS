"""Structured execution planning imported from Empire-OS."""
import hashlib,re
from dataclasses import asdict,dataclass
@dataclass(frozen=True)
class PlanTask:
    id:str; title:str; description:str; action:str; requires_permission:bool; verification:str; status:str="PENDING"
    def as_dict(self): return asdict(self)
class ExecutionPlanner:
    ACTION_RULES=(("write file","file_write",True),("create file","file_write",True),("read file","file_read",False),("open file","file_read",False),("git status","git_status",False),("repository status","git_status",False),("search project","project_search",False),("search code","project_search",False),("find in project","project_search",False),("find in code","project_search",False),("search repository","project_search",False),("find code","project_search",False),("inspect","inspect_project",False),("run tests","run_tests",False),("test","run_tests",False))
    @staticmethod
    def _plan_id(text): return "PLAN-"+hashlib.sha256(text.encode()).hexdigest()[:12]
    @staticmethod
    def _extract_goal(text):
        for line in text.splitlines():
            m=re.match(r"^\s*Goal:\s*(.+?)\s*$",line,re.I)
            if m:return m.group(1)
        return ""
    @staticmethod
    def _extract_actions(text):
        a=[]
        for line in text.splitlines():
            m=re.match(r"^\s*\d+[.)]\s*(.+?)\s*$",line)
            if m:a.append(m.group(1))
        return a or ([text.strip()] if text.strip() else [])
    @classmethod
    def _map_action(cls,title):
        for keyword,action,permission in cls.ACTION_RULES:
            if keyword in title.lower(): return action,permission
        return "MANUAL_REVIEW",True
    def plan(self,decision):
        if not decision or decision.get("status")!="APPROVED": return {"status":"FAILED","plan_id":None,"goal":"","tasks":[],"verification_required":True}
        text=str(decision.get("decision","")); pid=self._plan_id(text); tasks=[]
        for i,title in enumerate(self._extract_actions(text),1):
            action,permission=self._map_action(title); tasks.append(PlanTask(f"{pid}-T{i:02d}",title,f"Execute planned step: {title}",action,permission,"Verify the outcome before marking the task complete.").as_dict())
        return {"status":"READY","plan_id":pid,"goal":self._extract_goal(text),"tasks":tasks,"verification_required":True}
