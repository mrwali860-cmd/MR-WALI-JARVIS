const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const MEMORY_FILE = path.join(__dirname, "memory.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      fs.writeFileSync(
        MEMORY_FILE,
        JSON.stringify({ commands: [] }, null, 2)
      );
    }

    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch (error) {
    console.error("MEMORY LOAD ERROR:", error.message);
    return { commands: [] };
  }
}

function saveMemory(memory) {
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(memory, null, 2)
  );
}

function rememberCommand(message, result) {
  const memory = loadMemory();

  memory.commands.push({
    message,
    type: result.type,
    action: result.action,
    timestamp: new Date().toISOString()
  });

  memory.commands = memory.commands.slice(-100);

  saveMemory(memory);
}

function getMemorySummary() {
  const memory = loadMemory();

  if (memory.commands.length === 0) {
    return "I do not have any saved memories yet.";
  }

  const recent = memory.commands.slice(-10);

  return recent
    .map((item, index) => `${index + 1}. ${item.message}`)
    .join("\n");
}

function findMainGoal() {
  const memory = loadMemory();

  const goal = [...memory.commands]
    .reverse()
    .find(item => {
      const text = item.message.toLowerCase();

      return (
        text.includes("my main goal") ||
        text.includes("my goal is") ||
        text.includes("my goal")
      );
    });

  if (!goal) {
    return "I could not find a saved main goal.";
  }

  return `Your saved main goal is: ${goal.message}`;
}

function analyzeCommand(message) {
  const text = message.toLowerCase();

  if (
    text.includes("show my memory") ||
    text.includes("show memory") ||
    text.includes("my memory")
  ) {
    return {
      type: "MEMORY_RETRIEVAL",
      action: "SHOW_MEMORY",
      response: `Here is what I remember:\n\n${getMemorySummary()}`
    };
  }

  if (
    text.includes("what is my main goal") ||
    text.includes("what's my main goal") ||
    text.includes("remember my goal")
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
        "Highest priority: Get one real prospect and move them toward a conversation. Do not spend today building more features before creating revenue opportunities."
    };
  }

  if (text.includes("lead") || text.includes("prospect")) {
    return {
      type: "LEAD_ACQUISITION",
      action: "LEAD_DISCOVERY",
      response:
        "Lead Acquisition selected. Next action: find prospects, qualify them, and prepare outreach."
    };
  }

  if (text.includes("status")) {
    return {
      type: "SYSTEM_STATUS",
      action: "STATUS_CHECK",
      response:
        "MR WALI JARVIS is ONLINE. Memory system and memory retrieval are active."
    };
  }

  return {
    type: "GENERAL_COMMAND",
    action: "ANALYZE",
    response:
      `Command received: "${message}". Jarvis has saved this command to memory.`
  };
}

app.get("/api/status", (req, res) => {
  const memory = loadMemory();

  res.json({
    name: "MR WALI JARVIS",
    status: "ONLINE",
    version: "1.2.0",
    brain: "LOCAL RULE ENGINE",
    memoryStatus: "ACTIVE",
    memoryRetrieval: "ACTIVE",
    rememberedCommands: memory.commands.length
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

    const result = analyzeCommand(message);

    rememberCommand(message, result);

    console.log("\nJARVIS COMMAND RECEIVED");
    console.log("COMMAND:", message);
    console.log("TYPE:", result.type);
    console.log("ACTION:", result.action);
    console.log("MEMORY: SAVED");

    res.json({
      success: true,
      jarvis: result.response,
      commandType: result.type,
      action: result.action
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
  console.log(`MR WALI JARVIS ONLINE: http://localhost:${PORT}`);
  console.log("JARVIS MEMORY SYSTEM: ACTIVE");
  console.log("JARVIS MEMORY RETRIEVAL: ACTIVE");
});
