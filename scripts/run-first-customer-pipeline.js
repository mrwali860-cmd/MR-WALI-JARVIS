"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { FirstCustomerAcquisitionV1 } = require("../src/business/first-customer-acquisition-v1");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "data", "first-customer-prospects.json");
const outputPath = path.join(root, "data", "first-customer-pipeline.json");

function main() {
  if (!fs.existsSync(inputPath)) {
    fs.mkdirSync(path.dirname(inputPath), { recursive: true });
    fs.writeFileSync(inputPath, JSON.stringify({
      target_market: "Pakistan small businesses",
      note: "Add only real businesses you have verified. Do not invent company/contact details.",
      prospects: [
        {
          "company": "REPLACE_WITH_VERIFIED_BUSINESS",
          "category": "REPLACE_WITH_CATEGORY",
          "city": "REPLACE_WITH_CITY",
          "website": "",
          "email": "",
          "phone": "",
          "source_url": "",
          "observed_problem": "",
          "verified_by_human": false
        }
      ]
    }, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({
      status: "INPUT_TEMPLATE_CREATED",
      input: inputPath,
      next_action: "Replace the placeholder with verified prospect data, then run this command again.",
      messages_sent: 0,
      sales_won: 0
    }, null, 2));
    return;
  }

  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(input.prospects)) throw new Error("INPUT_MUST_INCLUDE_PROSPECTS_ARRAY");
  const engine = new FirstCustomerAcquisitionV1({
    targetMarket: input.target_market || "Pakistan small businesses",
    offer: input.offer,
    outcome: input.outcome,
    senderName: input.sender_name
  });
  const result = engine.build(input.prospects);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({
    status: result.status,
    target_market: result.target_market,
    summary: result.summary,
    output: outputPath,
    send_status: "NOT_SENT",
    next_action: "Review and verify each record and draft manually. Do not send without explicit approval."
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`FIRST_CUSTOMER_PIPELINE_FAILED: ${error.message}`);
  process.exitCode = 1;
}
