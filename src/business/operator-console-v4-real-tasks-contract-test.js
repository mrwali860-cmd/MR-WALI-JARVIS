const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(`V4 CONTRACT FAIL: ${message}`);
}

const architecture = read("docs/architecture/operator-console-v4-real-tasks.md");
const server = read("server.js");
const orchestrator = read("src/business/orchestrator.js");
const dashboardActions = read("src/business/dashboard-actions.js");
const adapter = read("src/business/operator-console-v4-real-task-command.js");

assert(architecture.includes("Browser chat") && architecture.includes("Orchestrator.executeTask()"), "locked V4 flow is missing");
assert(architecture.includes("no approval bypass") || architecture.includes("approval bypass"), "approval-boundary rule is not documented");
assert(orchestrator.includes("executeTask") && orchestrator.includes("riskPolicy"), "existing Orchestrator is not the execution authority");
assert(dashboardActions.includes("orchestrator.executeTask"), "Dashboard Action Boundary does not delegate to Orchestrator");
assert(server.includes('app.post("/ask"') && server.includes("OperatorConsoleV4TaskCommand"), "server V4 /ask integration is missing");
assert(server.includes("getOperatorConsoleV4TaskCommand()"), "server does not use the V4 adapter factory");
assert((server.match(/new Orchestrator\(/g) || []).length === 1, "server must have exactly one Orchestrator construction site");
assert(server.includes("orchestrator = new Orchestrator") && server.includes("getOrchestrator()"), "server must share the Orchestrator singleton");
assert(!server.includes("child_process") && !server.includes("execFileSync"), "V4 must not introduce direct process execution");
assert(adapter.includes("orchestrator.executeTask") && adapter.includes('action: "EXECUTE_TASK"'), "V4 adapter must delegate EXECUTE_TASK to Orchestrator");
assert(adapter.includes("crypto.randomUUID"), "V4 adapter must generate a unique request_id");

console.log("OPERATOR CONSOLE V4 REAL TASK CONTRACT TEST: PASS");
