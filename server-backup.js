const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const JARVIS_SYSTEM = {
  name: "MR WALI JARVIS",
  version: "1.0.0",
  status: "ONLINE"
};

function analyzeCommand(message) {
  const text = message.toLowerCase();

  if (text.includes("priority") || text.includes("highest priority")) {
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
        "Lead Acquisition workflow selected. Next system action: find prospects, qualify them, and prepare outreach."
    };
  }

  if (text.includes("workflow") || text.includes("n8n")) {
    return {
      type: "AUTOMATION",
      action: "WORKFLOW_CONTROL",
      response:
        "Automation command detected. Jarvis is ready to connect this command to an n8n workflow."
    };
  }

  if (text.includes("status")) {
    return {
      type: "SYSTEM_STATUS",
      action: "STATUS_CHECK",
      response:
        "MR WALI JARVIS is ONLINE. Brain adapter is currently running in local rule-based mode. Tool integrations are being connected."
    };
  }

  return {
    type: "GENERAL_COMMAND",
    action: "ANALYZE",
    response:
      `Command received: "${message}". Jarvis has analyzed the request. AI brain integration will expand this command into deeper reasoning and autonomous execution.`
  };
}

app.get("/api/status", (req, res) => {
  res.json({
    ...JARVIS_SYSTEM,
    brain: "LOCAL RULE ENGINE",
    tools: ["COMMAND ROUTER"],
    timestamp: new Date().toISOString()
  });
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

    console.log("\nJARVIS COMMAND RECEIVED");
    console.log("COMMAND:", message);
    console.log("TYPE:", result.type);
    console.log("ACTION:", result.action);

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
});
