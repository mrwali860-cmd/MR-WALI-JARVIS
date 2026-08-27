const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

const MEMORY_FILE = path.join(__dirname, "memory.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


/* =========================
   MEMORY
========================= */

function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      fs.writeFileSync(
        MEMORY_FILE,
        JSON.stringify({ memories: [] }, null, 2)
      );
    }

    const data = JSON.parse(
      fs.readFileSync(MEMORY_FILE, "utf8")
    );

    // Upgrade old memory format
    if (data.commands && !data.memories) {
      data.memories = data.commands;
      delete data.commands;
      saveMemory(data);
    }

    return data;

  } catch (error) {
    console.error("MEMORY LOAD ERROR:", error.message);

    return {
      memories: []
    };
  }
}


function saveMemory(memory) {
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(memory, null, 2)
  );
}


/* =========================
   SMART MEMORY CLASSIFIER
========================= */

function classifyMemory(message) {

  const text = message.toLowerCase();

  // Temporary commands
  if (
    text.includes("show my memory") ||
    text.includes("show memory") ||
    text.includes("what is my main goal") ||
    text.includes("what's my main goal") ||
    text.includes("status") ||
    text.includes("priority")
  ) {
    return {
      shouldSave: false,
      category: "TEMPORARY_COMMAND"
    };
  }


  // Goals
  if (
    text.includes("my goal") ||
    text.includes("my main goal") ||
    text.includes("i want to build") ||
    text.includes("i want to become")
  ) {
    return {
      shouldSave: true,
      category: "GOAL"
    };
  }


  // Tasks
  if (
    text.includes("i need to") ||
    text.includes("today i need") ||
    text.includes("my task") ||
    text.includes("next task")
  ) {
    return {
      shouldSave: true,
      category: "TASK"
    };
  }


  // Decisions
  if (
    text.includes("we decided") ||
    text.includes("decision") ||
    text.includes("from now on") ||
    text.includes("we will")
  ) {
    return {
      shouldSave: true,
      category: "DECISION"
    };
  }


  // Business
  if (
    text.includes("business") ||
    text.includes("client") ||
    text.includes("revenue") ||
    text.includes("automation")
  ) {
    return {
      shouldSave: true,
      category: "BUSINESS"
    };
  }


  return {
    shouldSave: false,
    category: "TEMPORARY"
  };
}


function remember(message, classification) {

  if (!classification.shouldSave) {
    return false;
  }

  const memory = loadMemory();

  memory.memories.push({
    message,
    category: classification.category,
    timestamp: new Date().toISOString()
  });

  memory.memories =
    memory.memories.slice(-100);

  saveMemory(memory);

  return true;
}


/* =========================
   MEMORY RETRIEVAL
========================= */

function getMemorySummary() {

  const memory = loadMemory();

  if (memory.memories.length === 0) {
    return "I do not have any saved memories yet.";
  }

  return memory.memories
    .slice(-10)
    .map((item, index) =>
      `${index + 1}. [${item.category}] ${item.message}`
    )
    .join("\n");
}


function findMainGoal() {

  const memory = loadMemory();

  const goal = [...memory.memories]
    .reverse()
    .find(item =>
      item.category === "GOAL"
    );

  if (!goal) {
    return "I could not find a saved main goal.";
  }

  return `Your saved main goal is: ${goal.message}`;
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
      type: "MEMORY_RETRIEVAL",
      action: "SHOW_MEMORY",
      response:
        `Here is what I remember:\n\n${getMemorySummary()}`
    };
  }


  if (
    text.includes("what is my main goal") ||
    text.includes("what's my main goal")
  ) {

    return {
      type: "GOAL_RETRIEVAL",
      action: "FIND_MAIN_GOAL",
      response: findMainGoal()
    };
  }


  if (text.includes("priority")) {

    return {
      type: "BUSINESS_PRIORITY",
      action: "ANALYZE_PRIORITY",
      response:
        "Highest priority: Get one real prospect and move them toward a conversation."
    };
  }


  if (
    text.includes("lead") ||
    text.includes("prospect")
  ) {

    return {
      type: "LEAD_ACQUISITION",
      action: "LEAD_DISCOVERY",
      response:
        "Lead Acquisition selected. Next action: find prospects and prepare outreach."
    };
  }


  return {
    type: "GENERAL_COMMAND",
    action: "ANALYZE",
    response:
      `Command analyzed: "${message}"`
  };
}
/* =========================
   ACTION ENGINE
========================= */

function executeAction(result, message) {

  if (result.action === "LEAD_DISCOVERY") {

    return {
      executed: true,
      action: "LEAD_DISCOVERY",
      status: "READY",
      target: "Dubai Real Estate",
      prospectsTarget: 20,
      message:
        "Prospect discovery task created. Target: 20 Dubai real estate prospects."
    };
  }


  if (result.action === "ANALYZE_PRIORITY") {

    return {
      executed: true,
      action: "ANALYZE_PRIORITY",
      status: "ACTIVE",
      message:
        "Priority confirmed: Get the first AI automation client."
    };
  }


  if (result.action === "SHOW_MEMORY") {

    return {
      executed: true,
      action: "SHOW_MEMORY",
      status: "COMPLETE",
      message: result.response
    };
  }


  if (result.action === "FIND_MAIN_GOAL") {

    return {
      executed: true,
      action: "FIND_MAIN_GOAL",
      status: "COMPLETE",
      message: result.response
    };
  }


  return {
    executed: false,
    action: result.action,
    status: "ANALYZED",
    message: result.response
  };
} 

/* =========================
   API
========================= */

app.get("/api/status", (req, res) => {

  const memory = loadMemory();

  res.json({
    name: "MR WALI JARVIS",
    status: "ONLINE",
    version: "1.3.0",
    brain: "LOCAL RULE ENGINE",
    smartMemory: "ACTIVE",
    rememberedMemories:
      memory.memories.length
  });

});


app.get("/api/memory", (req, res) => {

  res.json(loadMemory());

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


    const result =
      analyzeCommand(message);

    const classification =
      classifyMemory(message);

    const saved =
      remember(
        message,
        classification
      );

    const actionResult =
      executeAction(result, message);


    console.log("\nJARVIS COMMAND");
    console.log("MESSAGE:", message);
    console.log("TYPE:", result.type);
    console.log(
      "MEMORY CATEGORY:",
      classification.category
    );
    console.log(
      "SAVED:",
      saved
    );


    res.json({

      success: true,

      jarvis:
        actionResult.message,

      commandType:
        result.type,

      memoryCategory:
        classification.category,

      memorySaved:
        saved,

      actionExecuted:
        actionResult.executed,

      action:
        actionResult.action,

      actionStatus:
        actionResult.status

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


const PORT = 3000;


app.listen(PORT, () => {

  console.log(
    `MR WALI JARVIS ONLINE: http://localhost:${PORT}`
  );

  console.log(
    "SMART MEMORY SYSTEM: ACTIVE"
  );

});





