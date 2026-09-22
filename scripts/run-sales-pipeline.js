"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { AiDemandProspectDiscovery } = require("../src/business/ai-demand-prospect-discovery");
const OutreachLive = require("../src/business/outreach-live");
const { EmailOutreachProviderV1 } = require("../src/business/email-outreach-provider-v1");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT = path.join(DATA_DIR, "ai-demand-sales-pipeline.json");

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

async function main() {
  const discovery = new AiDemandProspectDiscovery({
    limit: Number(process.env.AI_DEMAND_MAX_RESULTS || 20)
  });
  const result = await discovery.discover();
  if (!result.executed) {
    console.error(result.message);
    process.exitCode = 1;
    return;
  }

  const prospects = result.prospects.map(p => ({
    ...p,
    email: p.email || "",
    contact: p.contact || "",
    status: "DISCOVERED"
  }));

  const outreach = new OutreachLive();
  const prepared = outreach.prepare(prospects.map(p => ({
    ...p,
    name: p.company,
    website: p.url
  })));

  const messages = prepared.messages.map((m, i) => ({
    ...m,
    email: prospects[i]?.email || "",
    status: "PENDING_APPROVAL"
  }));

  const payload = {
    generated_at: new Date().toISOString(),
    stage: "DISCOVERY_AND_OUTREACH_PREPARATION",
    target_market: result.target_market,
    demand_signal: result.evidence.demand_signal,
    prospects,
    outreach_messages: messages,
    send_status: "NOT_SENT",
    evidence: {
      discovery_provider: result.evidence.provider,
      external_email_execution: false,
      approval_required: true
    }
  };

  writeJson(OUTPUT, payload);
  console.log(JSON.stringify({
    status: "COMPLETE",
    prospects: prospects.length,
    outreach_messages: messages.length,
    output: OUTPUT,
    send_status: "NOT_SENT",
    next_action: "Review/approve messages, then run approved email sender with configured Resend credentials."
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
