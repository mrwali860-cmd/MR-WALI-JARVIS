"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { AiDemandProspectDiscovery } = require("../src/business/ai-demand-prospect-discovery");
const OutreachLive = require("../src/business/outreach-live");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT = path.join(DATA_DIR, "ai-demand-sales-pipeline.json");

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function hasEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    email: hasEmail(p.email) ? p.email.trim() : "",
    contact: p.contact || "",
    contact_status: hasEmail(p.email) ? "EMAIL_AVAILABLE" : "CONTACT_REQUIRED",
    status: "DISCOVERED"
  }));

  // Discovery currently targets AI hiring signals, while the default outreach
  // copy is for real-estate lead automation. Do not present these drafts as
  // approval-ready until a human explicitly confirms the offer/market match.
  const marketOfferAligned = process.env.SALES_MARKET_OFFER_ALIGNMENT_CONFIRMED === "true";
  const outreach = new OutreachLive();
  const prepared = outreach.prepare(prospects.map(p => ({
    ...p,
    name: p.company,
    website: p.url
  })));

  const messages = prepared.messages.map((m, i) => {
    const email = prospects[i]?.email || "";
    let status = "BLOCKED_MARKET_OFFER_MISMATCH";
    if (marketOfferAligned) status = hasEmail(email) ? "PENDING_APPROVAL" : "CONTACT_REQUIRED";
    return { ...m, email, status };
  });

  const payload = {
    generated_at: new Date().toISOString(),
    stage: "DISCOVERY_AND_OUTREACH_PREPARATION",
    target_market: result.target_market,
    demand_signal: result.evidence.demand_signal,
    prospects,
    outreach_messages: messages,
    send_status: "NOT_SENT",
    pipeline_checks: {
      market_offer_alignment_confirmed: marketOfferAligned,
      prospects_with_email: prospects.filter(p => hasEmail(p.email)).length,
      prospects_requiring_contact_enrichment: prospects.filter(p => !hasEmail(p.email)).length,
      messages_blocked_by_market_offer_mismatch: messages.filter(m => m.status === "BLOCKED_MARKET_OFFER_MISMATCH").length,
      messages_pending_approval: messages.filter(m => m.status === "PENDING_APPROVAL").length
    },
    evidence: {
      discovery_provider: result.evidence.provider,
      external_email_execution: false,
      approval_required: true
    }
  };

  writeJson(OUTPUT, payload);
  const checks = payload.pipeline_checks;
  console.log(JSON.stringify({
    status: "COMPLETE",
    prospects: prospects.length,
    prospects_with_email: checks.prospects_with_email,
    prospects_requiring_contact_enrichment: checks.prospects_requiring_contact_enrichment,
    outreach_messages: messages.length,
    messages_blocked_by_market_offer_mismatch: checks.messages_blocked_by_market_offer_mismatch,
    messages_pending_approval: checks.messages_pending_approval,
    output: OUTPUT,
    send_status: "NOT_SENT",
    next_action: !marketOfferAligned
      ? "Align the target market with the offer, then explicitly set SALES_MARKET_OFFER_ALIGNMENT_CONFIRMED=true before approving any messages."
      : checks.prospects_with_email === 0
        ? "Enrich verified business contact emails; no email messages are approval-ready."
        : "Review each message manually; sending remains disabled until email provider credentials and approval are verified."
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
