"""Response formatting imported from Empire-OS."""
class ResponseBuilder:
    def build(self,plan,context,orchestration_result=None):
        if plan["status"]!="READY": return "Unable to generate a response."
        lines=["","========== EMPIRE AI =========="]
        if plan.get("plan_id"): lines.append(f"Plan ID: {plan['plan_id']}")
        if plan.get("goal"): lines.append(f"Goal: {plan['goal']}")
        for i,task in enumerate(plan.get("tasks",[]),1):
            lines.extend([f"{i}. [{task.get('status','PENDING')}] {task.get('title','Untitled task')}",f"   Action: {task.get('action','MANUAL_REVIEW')}",f"   Permission: {'REQUIRED' if task.get('requires_permission') else 'NOT REQUIRED'}",f"   Verification: {task.get('verification','Verify outcome before completion.')}"])
        lines.extend(["","Status: READY FOR EXECUTION","Verification: REQUIRED","===============================",""])
        return "\n".join(lines)
