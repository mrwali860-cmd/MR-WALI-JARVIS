"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { EmailOutreachProviderV1 } = require("../src/business/email-outreach-provider-v1");

const INPUT = path.resolve(__dirname, "..", "data", "ai-demand-sales-pipeline.json");

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error("No sales pipeline file. Run npm run sales:pipeline first.");
    process.exitCode = 1;
    return;
  }

  const payload = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const provider = new EmailOutreachProviderV1();
  const result = await provider.sendApproved(payload.outreach_messages || []);

  payload.last_send_attempt_at = new Date().toISOString();
  payload.send_status = result.status;
  payload.send_result = result;
  fs.writeFileSync(INPUT, JSON.stringify(payload, null, 2), "utf8");

  console.log(JSON.stringify(result, null, 2));
  if (!result.executed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
