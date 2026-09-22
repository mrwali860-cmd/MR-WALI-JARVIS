"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { AiDemandProspectDiscovery } = require("../src/business/ai-demand-prospect-discovery");

const OUTPUT_FILE = path.resolve(process.env.AI_DEMAND_OUTPUT_FILE || "data/ai-demand-prospects.json");

async function run() {
  const discovery = new AiDemandProspectDiscovery();
  const result = await discovery.discover();

  if (!result.executed) {
    console.error(`AI DEMAND DISCOVERY BLOCKED: ${result.message}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    discovered_at: new Date().toISOString(),
    ...result
  }, null, 2));

  console.log("JARVIS AI DEMAND PROSPECT DISCOVERY");
  console.log(`Found: ${result.total_found}`);
  result.prospects.forEach((prospect, index) => {
    console.log(`\\n${index + 1}. ${prospect.company} — ${prospect.job_title}`);
    console.log(`   ${prospect.url}`);
  });
  console.log(`\\nSaved: ${OUTPUT_FILE}`);
  console.log("Status: DISCOVERED_ONLY — no applications, messages, or outreach were sent.");
}

run().catch(error => {
  console.error(`AI DEMAND DISCOVERY FAILED: ${error.message}`);
  process.exitCode = 1;
});
