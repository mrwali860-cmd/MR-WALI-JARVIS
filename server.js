require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ServiceManager = require("./src/business/service-manager");
const TaskManager = require("./src/business/task-manager");
const QualityAssurance = require("./src/business/qa");
const ClientApproval = require("./src/business/client-approval");
const Delivery = require("./src/business/delivery");
const Revenue = require("./src/business/revenue");
const DashboardReadModel = require("./src/business/dashboard-read-model");
const Orchestrator = require("./src/business/orchestrator");
const RealTaskExecutor = require("./src/business/real-task-executor");
const DashboardActionBoundary = require("./src/business/dashboard-actions");
const OperatorConsoleV4TaskCommand = require("./src/business/operator-console-v4-real-task-command");
const ProspectDiscoveryLive = require("./src/business/prospect-discovery-live");
const OutreachLive = require("./src/business/outreach-live");
const ProposalLive = require("./src/business/proposal-live");
const JarvisChatV2 = require("./src/business/jarvis-chat-v2");

const app = express();
const MEMORY_FILE = path.join(__dirname, "memory.json");
const STATE_FILE = path.join(__dirname, "jarvis_state.json");
app.use(cors()); app.use(express.json()); app.use(express.static(__dirname));
let dashboardReadModel = null;
let dashboardActionBoundary = null;
let jarvisChatV2 = null;
let operatorConsoleV4TaskCommand = null;
let orchestrator = null;
function getDashboardReadModel() { if (!dashboardReadModel) dashboardReadModel = new DashboardReadModel({ serviceManager: new ServiceManager(), taskManager: new TaskManager(), qa: new QualityAssurance(), clientApproval: new ClientApproval(), delivery: new Delivery(), revenue: new Revenue() }); return dashboardReadModel; }
function getOrchestrator() { if (!orchestrator) { const dashboard = getDashboardReadModel(); orchestrator = new Orchestrator({ serviceManager: dashboard.serviceManager, taskManager: dashboard.taskManager, executor: new RealTaskExecutor() }); } return orchestrator; }
function getDashboardActionBoundary() { if (!dashboardActionBoundary) dashboardActionBoundary = new DashboardActionBoundary({ orchestrator: getOrchestrator() }); return dashboardActionBoundary; }
function getJarvisChatV2() { if (!jarvisChatV2) jarvisChatV2 = new JarvisChatV2(); return jarvisChatV2; }
function getOperatorConsoleV4TaskCommand() { if (!operatorConsoleV4TaskCommand) operatorConsoleV4TaskCommand = new OperatorConsoleV4TaskCommand({ orchestrator: getOrchestrator() }); return operatorConsoleV4TaskCommand; }
function readJSON(file, fallback) { try { if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; } return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { console.error("READ ERROR:", error.message); return fallback; } }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function loadMemory() { const memory = readJSON(MEMORY_FILE, { memories: [] }); if (memory.commands && !memory.memories) { memory.memories = memory.commands; delete memory.commands; writeJSON(MEMORY_FILE, memory); } return memory; }
function saveMemory(memory) { writeJSON(MEMORY_FILE, memory); }
function classifyMemory(message) { const text = message.toLowerCase(); if (text.includes("show my memory") || text.includes("show memory") || text.includes("show mission") || text.includes("mission status") || text.includes("what is my main goal")) return { shouldSave: false, category: "TEMPORARY_COMMAND" }; if (text.includes("first ai automation client") || text.includes("first automation client") || text.includes("get my first client") || text.includes("my goal") || text.includes("i want to build")) return { shouldSave: true, category: "GOAL" }; if (text.includes("start") || text.includes("i need to") || text.includes("my task")) return { shouldSave: true, category: "TASK" }; return { shouldSave: false, category: "TEMPORARY" }; }
function remember(message, classification) { if (!classification.shouldSave) return false; const memory = loadMemory(); memory.memories.push({ message, category: classification.category, timestamp: new Date().toISOString() }); memory.memories = memory.memories.slice(-100); saveMemory(memory); return true; }
function getMemorySummary() { const memory = loadMemory(); if (!memory.memories.length) return "I do not have any saved memories yet."; return memory.memories.slice(-10).map((item, index) => `${index + 1}. [${item.category}] ${item.message}`).join("\n"); }
function loadState() { return readJSON(STATE_FILE, { activeMission: null, tasks: [], updatedAt: null }); }
function saveState(state) { state.updatedAt = new Date().toISOString(); writeJSON(STATE_FILE, state); }
function startFirstClientMission() { const state = loadState(); state.activeMission = { id: "FIRST_AI_AUTOMATION_CLIENT", name: "Get First AI Automation Client", status: "ACTIVE", currentStage: "PROSPECT_DISCOVERY", targetMarket: "Dubai Real Estate", prospectTarget: 20, prospectsFound: 0, startedAt: new Date().toISOString() }; state.tasks = [{ id: "PROSPECT_DISCOVERY", name: "Find 20 Dubai real estate prospects", status: "READY" }, { id: "QUALIFICATION", name: "Qualify prospects", status: "LOCKED" }, { id: "DECISION_MAKER", name: "Identify decision makers", status: "LOCKED" }, { id: "OUTREACH", name: "Prepare personalized outreach", status: "LOCKED" }, { id: "PROPOSAL", name: "Prepare service proposals", status: "LOCKED" }]; saveState(state); return state; }
function getMissionStatus() { const state = loadState(); if (!state.activeMission) return "No active mission. Tell me your goal and I will create one."; const mission = state.activeMission; const outreachCount = (state.outreachMessages || []).length; const proposalCount = (state.proposals || []).length; return [`Mission: ${mission.name}`, `Status: ${mission.status}`, `Current Stage: ${mission.currentStage}`, `Market: ${mission.targetMarket}`, `Prospects: ${mission.prospectsFound}/${mission.prospectTarget}`, `Outreach prepared: ${outreachCount}`, `Proposals: ${proposalCount}`, "Next Action: " + (mission.currentStage === "PROPOSAL" ? "Approve proposals" : mission.currentStage === "OUTREACH" ? "Approve outreach or prepare proposal" : "Continue pipeline")].join("\n"); }
function analyzeCommand(message) { const text = message.toLowerCase(); if (text.includes("show my memory") || text.includes("show memory")) return { type: "MEMORY", action: "SHOW_MEMORY" }; if (text.includes("show mission") || text.includes("mission status") || text.includes("show status")) return { type: "MISSION", action: "SHOW_MISSION" }; if (text.includes("first ai automation client") || text.includes("first automation client") || text.includes("get my first client")) return { type: "CLIENT_ACQUISITION", action: "START_FIRST_CLIENT_MISSION" }; if (text.includes("start prospect discovery") || text.includes("prospect discovery") || text.includes("find prospects")) return { type: "LEAD_ACQUISITION", action: "LEAD_DISCOVERY" }; if (text.includes("prepare proposal") || text.includes("start proposal") || text.includes("generate proposal")) return { type: "PROPOSAL", action: "PREPARE_PROPOSAL" }; if (text.includes("approve proposal") || text.includes("approve proposals")) return { type: "PROPOSAL", action: "APPROVE_PROPOSAL" }; if (text.includes("show proposal") || text.includes("list proposal") || text.includes("show proposals")) return { type: "PROPOSAL", action: "SHOW_PROPOSAL" }; if (text.includes("prepare outreach") || text.includes("start outreach") || text.includes("outreach messages") || text.includes("generate messages")) return { type: "OUTREACH", action: "PREPARE_OUTREACH" }; if (text.includes("approve outreach") || text.includes("approve messages")) return { type: "OUTREACH", action: "APPROVE_OUTREACH" }; if (text.includes("export outreach") || text.includes("export messages")) return { type: "OUTREACH", action: "EXPORT_OUTREACH" }; if (text.includes("show outreach") || text.includes("list outreach")) return { type: "OUTREACH", action: "SHOW_OUTREACH" }; return { type: "GENERAL", action: "ANALYZE" }; }
async function executeAction(result, message) {
  if (result.action === "SHOW_MEMORY") return { executed: true, status: "COMPLETE", message: getMemorySummary() };
  if (result.action === "SHOW_MISSION") return { executed: true, status: "COMPLETE", message: getMissionStatus() };
  if (result.action === "START_FIRST_CLIENT_MISSION") {
    const state = startFirstClientMission();
    return { executed: true, status: "ACTIVE", message: `Mission activated: Get your first AI automation client.\n\nCurrent stage: Prospect Discovery\nTarget: ${state.activeMission.prospectTarget} Dubai real estate prospects.\n\nNext action: Start prospect discovery.` };
  }
  if (result.action === "LEAD_DISCOVERY") {
    const state = loadState();
    if (!state.activeMission) return { executed: false, status: "BLOCKED", message: "No active mission found. First start your client acquisition mission." };
    const discovery = await discoverProspects();
    if (!discovery.executed) return discovery;
    state.activeMission.currentStage = "PROSPECT_DISCOVERY";
    state.activeMission.status = "ACTIVE";
    state.activeMission.prospectsFound = discovery.prospects.length;
    state.prospects = discovery.prospects;
    const task = state.tasks.find(item => item.id === "PROSPECT_DISCOVERY");
    if (task) task.status = "COMPLETE";
    const outreachTask = state.tasks.find(item => item.id === "OUTREACH");
    if (outreachTask) outreachTask.status = "READY";
    const proposalTask = state.tasks.find(item => item.id === "PROPOSAL");
    if (proposalTask) proposalTask.status = "READY";
    saveState(state);
    const prospectList = discovery.prospects.map((p, i) => `${i + 1}. ${p.name}${p.phone ? ` | ${p.phone}` : ""}${p.website ? ` | ${p.website}` : ""}`).join("\n");
    return { executed: true, status: "COMPLETE", message: `Prospect Discovery complete.\n\nFound ${discovery.prospects.length} real prospects:\n\n${prospectList}\n\nNext: "prepare outreach" or "prepare proposal".` };
  }
  if (result.action === "PREPARE_OUTREACH") {
    const state = loadState();
    if (!state.prospects || !state.prospects.length) {
      return { executed: false, status: "BLOCKED", message: "No prospects in memory. Run prospect discovery first." };
    }
    const outreach = new OutreachLive();
    const prepared = outreach.prepare(state.prospects);
    if (!prepared.executed) return prepared;
    state.outreachMessages = prepared.messages;
    if (state.activeMission) state.activeMission.currentStage = "OUTREACH";
    const task = (state.tasks || []).find(item => item.id === "OUTREACH");
    if (task) task.status = "PENDING_APPROVAL";
    saveState(state);
    const preview = prepared.messages.slice(0, 3).map((m, i) => `--- Message ${i + 1} (${m.prospect_name}) ---\n${m.body}`).join("\n\n");
    return {
      executed: true,
      status: "COMPLETE",
      message: `Prepared ${prepared.total} outreach messages.\n\nPreview (first 3):\n\n${preview}\n\n...and ${Math.max(0, prepared.total - 3)} more.\n\nNext: Type "approve outreach" to approve all.`
    };
  }
  if (result.action === "APPROVE_OUTREACH") {
    const state = loadState();
    if (!state.outreachMessages || !state.outreachMessages.length) {
      return { executed: false, status: "BLOCKED", message: "No outreach messages to approve. Run prepare outreach first." };
    }
    const outreach = new OutreachLive();
    const approved = outreach.approve(state.outreachMessages);
    state.outreachMessages = approved.messages;
    const task = (state.tasks || []).find(item => item.id === "OUTREACH");
    if (task) task.status = "APPROVED";
    saveState(state);
    return {
      executed: true,
      status: "COMPLETE",
      message: `Approved ${approved.total} messages.\n\nNext: "export outreach" or "prepare proposal".`
    };
  }
  if (result.action === "EXPORT_OUTREACH") {
    const state = loadState();
    if (!state.outreachMessages || !state.outreachMessages.length) {
      return { executed: false, status: "BLOCKED", message: "No outreach messages to export. Run prepare outreach first." };
    }
    const outreach = new OutreachLive({ exportDir: __dirname });
    const exported = outreach.export(state.outreachMessages);
    if (!exported.executed) return exported;
    state.lastOutreachExport = { at: new Date().toISOString(), files: exported.files, total: exported.total };
    saveState(state);
    return { executed: true, status: "COMPLETE", message: exported.message };
  }
  if (result.action === "SHOW_OUTREACH") {
    const state = loadState();
    const list = state.outreachMessages || [];
    if (!list.length) return { executed: true, status: "COMPLETE", message: "No outreach messages prepared yet." };
    const summary = list.map((m, i) => `${i + 1}. [${m.status}] ${m.prospect_name} | ${m.phone || m.website || "no contact"}`).join("\n");
    return { executed: true, status: "COMPLETE", message: `Outreach list (${list.length}):\n\n${summary}` };
  }
  if (result.action === "PREPARE_PROPOSAL") {
    const state = loadState();
    if (!state.prospects || !state.prospects.length) {
      return { executed: false, status: "BLOCKED", message: "No prospects in memory. Run prospect discovery first." };
    }
    const proposalEngine = new ProposalLive();
    const prepared = proposalEngine.prepare(state.prospects);
    if (!prepared.executed) return prepared;
    state.proposals = prepared.proposals;
    if (state.activeMission) state.activeMission.currentStage = "PROPOSAL";
    const task = (state.tasks || []).find(item => item.id === "PROPOSAL");
    if (task) task.status = "PENDING_APPROVAL";
    saveState(state);
    const preview = prepared.proposals.slice(0, 2).map((p, i) => `--- Proposal ${i + 1} (${p.prospect_name}) [${p.qualification}] ---\n${p.body}`).join("\n\n");
    return {
      executed: true,
      status: "COMPLETE",
      message: `Level 3: Prepared ${prepared.total} proposals (${prepared.qualified_count} qualified).\n\nService: AI Appointment Booking Automation\n\nPreview (first 2):\n\n${preview}\n\n...and ${Math.max(0, prepared.total - 2)} more.\n\nNext: Type "approve proposal".`
    };
  }
  if (result.action === "APPROVE_PROPOSAL") {
    const state = loadState();
    if (!state.proposals || !state.proposals.length) {
      return { executed: false, status: "BLOCKED", message: "No proposals to approve. Run prepare proposal first." };
    }
    const proposalEngine = new ProposalLive();
    const approved = proposalEngine.approve(state.proposals);
    state.proposals = approved.proposals;
    const task = (state.tasks || []).find(item => item.id === "PROPOSAL");
    if (task) task.status = "APPROVED";
    saveState(state);
    return {
      executed: true,
      status: "COMPLETE",
      message: `Approved ${approved.total} proposals.\n\nStatus: READY TO SHARE\n\nNext Level 3/4: share proposal with prospect, then delivery planning.`
    };
  }
  if (result.action === "SHOW_PROPOSAL") {
    const state = loadState();
    const list = state.proposals || [];
    if (!list.length) return { executed: true, status: "COMPLETE", message: "No proposals prepared yet. Type prepare proposal." };
    const summary = list.map((p, i) => `${i + 1}. [${p.status}] [${p.qualification}] ${p.prospect_name} | ${p.service_name}`).join("\n");
    return { executed: true, status: "COMPLETE", message: `Proposal list (${list.length}):\n\n${summary}` };
  }
  return { executed: false, status: "ANALYZED", message: `Command analyzed: "${message}"` };
}
app.get("/api/dashboard/status", (req, res) => { try { res.json(getDashboardReadModel().getStatus()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/services", (req, res) => { try { res.json(getDashboardReadModel().getServices()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/tasks", (req, res) => { try { res.json(getDashboardReadModel().getTasks()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/activity", (req, res) => { try { res.json(getDashboardReadModel().getActivity()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/qa", (req, res) => { try { res.json(getDashboardReadModel().getQA()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/client-approval", (req, res) => { try { res.json(getDashboardReadModel().getClientApproval()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/delivery", (req, res) => { try { res.json(getDashboardReadModel().getDelivery()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.get("/api/dashboard/revenue", (req, res) => { try { res.json(getDashboardReadModel().getRevenue()); } catch (error) { res.status(500).json({ success: false, error: error.message }); } });
app.post("/api/dashboard/actions", async (req, res) => { try { const result = await getDashboardActionBoundary().execute(req.body || {}); res.status(result.success ? 200 : 422).json(result); } catch (error) { res.status(400).json({ success: false, error: error.message, request_id: req.body && req.body.request_id ? req.body.request_id : null }); } });
app.get("/api/status", (req, res) => { const memory = loadMemory(); const state = loadState(); res.json({ name: "MR WALI JARVIS", status: "ONLINE", version: "2.0.0", brain: "LOCAL EXECUTION ENGINE", smartMemory: "ACTIVE", rememberedMemories: memory.memories.length, activeMission: state.activeMission }); });
app.get("/api/memory", (req, res) => res.json(loadMemory())); app.get("/api/mission", (req, res) => res.json(loadState()));
app.post("/ask", async (req, res) => { try { const { message } = req.body; if (!message) return res.status(400).json({ success: false, error: "Message is required" }); const result = analyzeCommand(message); const classification = classifyMemory(message); const saved = remember(message, classification); if (getOperatorConsoleV4TaskCommand().isTaskCommand(message)) { const taskResult = await getOperatorConsoleV4TaskCommand().execute(message, { approval_context: req.body.approval_context || {}, input: req.body.input || null }); return res.json({ success: taskResult.success, jarvis: taskResult.message, commandType: "TASK_EXECUTION", action: "EXECUTE_TASK", actionExecuted: taskResult.success, actionStatus: taskResult.status, request_id: taskResult.request_id || null, trace: taskResult.result?.trace || null, memoryCategory: classification.category, memorySaved: saved }); } if (result.action === "ANALYZE") { const chat = await getJarvisChatV2().respond(message, { mission: loadState().activeMission, recentMemory: loadMemory().memories.slice(-5) }); return res.json({ success: true, jarvis: chat.reply, commandType: result.type, action: result.action, actionExecuted: false, actionStatus: "ANALYZED", chatMode: chat.chatMode, memoryCategory: classification.category, memorySaved: saved }); } const actionResult = await executeAction(result, message); res.json({ success: true, jarvis: actionResult.message, commandType: result.type, action: result.action, actionExecuted: actionResult.executed, actionStatus: actionResult.status, chatMode: "FALLBACK", memoryCategory: classification.category, memorySaved: saved }); } catch (error) { res.status(500).json({ success: false, error: error.message, chatMode: "FALLBACK" }); } });
const PORT = 3000; const server = app.listen(PORT, () => { console.log(`MR WALI JARVIS ONLINE: http://localhost:${PORT}`); console.log("SMART MEMORY SYSTEM: ACTIVE"); console.log("MISSION & ACTION ENGINE: ACTIVE"); console.log("LEVEL 2 OUTREACH: READY"); console.log("LEVEL 3 PROPOSAL: READY"); });
module.exports = { app, server, port: PORT, close: () => server.close() };
async function discoverProspects() { const discovery = new ProspectDiscoveryLive({ limit: 20, query: "real estate agency Dubai" }); return discovery.discover(); }
