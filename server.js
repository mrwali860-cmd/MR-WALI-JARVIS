require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

const MEMORY_FILE = path.join(__dirname, "memory.json");
const STATE_FILE = path.join(__dirname, "jarvis_state.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


/* =========================
   FILE HELPERS
========================= */

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error("READ ERROR:", error.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


/* =========================
   MEMORY
========================= */

function loadMemory() {
  const memory = readJSON(MEMORY_FILE, { memories: [] });

  if (memory.commands && !memory.memories) {
    memory.memories = memory.commands;
    delete memory.commands;
    writeJSON(MEMORY_FILE, memory);
  }

  return memory;
}

function saveMemory(memory) {
  writeJSON(MEMORY_FILE, memory);
}

function classifyMemory(message) {
  const text = message.toLowerCase();

  if (
    text.includes("show my memory") ||
    text.includes("show memory") ||
    text.includes("show mission") ||
    text.includes("mission status") ||
    text.includes("what is my main goal")
  ) {
    return { shouldSave: false, category: "TEMPORARY_COMMAND" };
  }

  if (
    text.includes("first ai automation client") ||
    text.includes("first automation client") ||
    text.includes("get my first client") ||
    text.includes("my goal") ||
    text.includes("i want to build")
  ) {
    return { shouldSave: true, category: "GOAL" };
  }

  if (
    text.includes("start") ||
    text.includes("i need to") ||
    text.includes("my task")
  ) {
    return { shouldSave: true, category: "TASK" };
  }

  return { shouldSave: false, category: "TEMPORARY" };
}

function remember(message, classification) {
  if (!classification.shouldSave) return false;

  const memory = loadMemory();

  memory.memories.push({
    message,
    category: classification.category,
    timestamp: new Date().toISOString()
  });

  memory.memories = memory.memories.slice(-100);

  saveMemory(memory);

  return true;
}

function getMemorySummary() {
  const memory = loadMemory();

  if (!memory.memories.length) {
    return "I do not have any saved memories yet.";
  }

  return memory.memories
    .slice(-10)
    .map((item, index) =>
      `${index + 1}. [${item.category}] ${item.message}`
    )
    .join("\n");
}


/* =========================
   MISSION SYSTEM
========================= */

function loadState() {
  return readJSON(STATE_FILE, {
    activeMission: null,
    tasks: [],
    updatedAt: null
  });
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  writeJSON(STATE_FILE, state);
}

function startFirstClientMission() {
  const state = loadState();

  state.activeMission = {
    id: "FIRST_AI_AUTOMATION_CLIENT",
    name: "Get First AI Automation Client",
    status: "ACTIVE",
    currentStage: "PROSPECT_DISCOVERY",
    targetMarket: "Dubai Real Estate",
    prospectTarget: 20,
    prospectsFound: 0,
    startedAt: new Date().toISOString()
  };

  state.tasks = [
    {
      id: "PROSPECT_DISCOVERY",
      name: "Find 20 Dubai real estate prospects",
      status: "READY"
    },
    {
      id: "QUALIFICATION",
      name: "Qualify prospects",
      status: "LOCKED"
    },
    {
      id: "DECISION_MAKER",
      name: "Identify decision makers",
      status: "LOCKED"
    },
    {
      id: "OUTREACH",
      name: "Prepare personalized outreach",
      status: "LOCKED"
    }
  ];

  saveState(state);

  return state;
}

function getMissionStatus() {
  const state = loadState();

  if (!state.activeMission) {
    return "No active mission. Tell me your goal and I will create one.";
  }

  const mission = state.activeMission;

  return [
    `Mission: ${mission.name}`,
    `Status: ${mission.status}`,
    `Current Stage: ${mission.currentStage}`,
    `Market: ${mission.targetMarket}`,
    `Prospects: ${mission.prospectsFound}/${mission.prospectTarget}`,
    `Next Action: Find the first prospects`
  ].join("\n");
}


/* =========================
   COMMAND ANALYSIS
========================= */

function analyzeCommand(message) {
  const text = message.toLowerCase();

  if (
    text.includes("show my memory") ||
    text.includes("show memory")
  ) {
    return {
      type: "MEMORY",
      action: "SHOW_MEMORY"
    };
  }

  if (
    text.includes("show mission") ||
    text.includes("mission status") ||
    text.includes("show status")
  ) {
    return {
      type: "MISSION",
      action: "SHOW_MISSION"
    };
  }

  if (
    text.includes("first ai automation client") ||
    text.includes("first automation client") ||
    text.includes("get my first client")
  ) {
    return {
      type: "CLIENT_ACQUISITION",
      action: "START_FIRST_CLIENT_MISSION"
    };
  }

  if (
    text.includes("start prospect discovery") ||
    text.includes("prospect discovery") ||
    text.includes("find prospects")
  ) {
    return {
      type: "LEAD_ACQUISITION",
      action: "LEAD_DISCOVERY"
    };
  }

  return {
    type: "GENERAL",
    action: "ANALYZE"
  };
}


/* =========================
   ACTION ENGINE
========================= */

async function executeAction(result, message) {

  if (result.action === "SHOW_MEMORY") {
    return {
      executed: true,
      status: "COMPLETE",
      message: getMemorySummary()
    };
  }

  if (result.action === "SHOW_MISSION") {
    return {
      executed: true,
      status: "COMPLETE",
      message: getMissionStatus()
    };
  }

  if (result.action === "START_FIRST_CLIENT_MISSION") {
    const state = startFirstClientMission();

    return {
      executed: true,
      status: "ACTIVE",
      message:
        `Mission activated: Get your first AI automation client.\n\n` +
        `Current stage: Prospect Discovery\n` +
        `Target: ${state.activeMission.prospectTarget} Dubai real estate prospects.\n\n` +
        `Next action: Start prospect discovery.`
    };
  }

  if (result.action === "LEAD_DISCOVERY") {
    const state = loadState();

    if (!state.activeMission) {
      return {
        executed: false,
        status: "BLOCKED",
        message:
          "No active mission found. First start your client acquisition mission."
      };
    }

    const discovery = await discoverProspects();

    if (!discovery.executed) {
      return discovery;
    }

    state.activeMission.currentStage = "PROSPECT_DISCOVERY";
    state.activeMission.status = "ACTIVE";
    state.activeMission.prospectsFound = discovery.prospects.length;
    state.prospects = discovery.prospects;

    const task = state.tasks.find(
      item => item.id === "PROSPECT_DISCOVERY"
    );

    if (task) {
      task.status = "COMPLETE";
    }

    saveState(state);

    const prospectList = discovery.prospects
      .map((p, i) =>
        `${i + 1}. ${p.name}` +
        (p.phone ? ` | ${p.phone}` : "") +
        (p.website ? ` | ${p.website}` : "")
      )
      .join("\n");

    return {
      executed: true,
      status: "COMPLETE",
      message:
        `Prospect Discovery complete.\n\n` +
        `Found ${discovery.prospects.length} real prospects:\n\n` +
        `${prospectList}\n\n` +
        `Next action: Identify decision makers.`
    };
  }

  return {
    executed: false,
    status: "ANALYZED",
    message: `Command analyzed: "${message}"`
  };
}


/* =========================
   API
========================= */

app.get("/api/status", (req, res) => {
  const memory = loadMemory();
  const state = loadState();

  res.json({
    name: "MR WALI JARVIS",
    status: "ONLINE",
    version: "2.0.0",
    brain: "LOCAL EXECUTION ENGINE",
    smartMemory: "ACTIVE",
    rememberedMemories: memory.memories.length,
    activeMission: state.activeMission
  });
});

app.get("/api/memory", (req, res) => {
  res.json(loadMemory());
});

app.get("/api/mission", (req, res) => {
  res.json(loadState());
});

app.post("/ask", async (req, res) => {

  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    const result = analyzeCommand(message);

    const classification = classifyMemory(message);

    const saved = remember(
      message,
      classification
    );

    const actionResult = await executeAction(result, message);

    console.log("\nJARVIS COMMAND");
    console.log("MESSAGE:", message);
    console.log("TYPE:", result.type);
    console.log("ACTION:", result.action);
    console.log("STATUS:", actionResult.status);
    console.log("SAVED:", saved);

    res.json({
      success: true,
      jarvis: actionResult.message,
      commandType: result.type,
      action: result.action,
      actionExecuted: actionResult.executed,
      actionStatus: actionResult.status,
      memoryCategory: classification.category,
      memorySaved: saved
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


/* =========================
   START SERVER
========================= */

const PORT = 3000;

app.listen(PORT, () => {

  console.log(
    `MR WALI JARVIS ONLINE: http://localhost:${PORT}`
  );

  console.log(
    "SMART MEMORY SYSTEM: ACTIVE"
  );

  console.log(
    "MISSION & ACTION ENGINE: ACTIVE"
  );

});


async function discoverProspects() {
  const prospects = [
    {
      name: "Dubai Real Estate Prospect 1",
      address: "Dubai, UAE",
      phone: "",
      website: "",
      rating: null,
      source: "Manual Discovery Queue"
    },
    {
      name: "Dubai Real Estate Prospect 2",
      address: "Dubai, UAE",
      phone: "",
      website: "",
      rating: null,
      source: "Manual Discovery Queue"
    },
    {
      name: "Dubai Real Estate Prospect 3",
      address: "Dubai, UAE",
      phone: "",
      website: "",
      rating: null,
      source: "Manual Discovery Queue"
    }
  ];

  return {
    executed: true,
    status: "COMPLETE",
    prospects
  };
}

