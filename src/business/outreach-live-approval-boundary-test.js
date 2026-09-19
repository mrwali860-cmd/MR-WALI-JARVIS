"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const OutreachLive = require("./outreach-live");

function makeMessage(status) {
  return {
    id: "outreach_1",
    prospect_name: "Test Realty",
    phone: "+971500000000",
    website: "https://example.com",
    channel: "WhatsApp/Phone",
    status,
    subject: "Test subject",
    body: "Test body"
  };
}

const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-outreach-"));

try {
  const outreach = new OutreachLive({ exportDir });

  const pending = outreach.export([makeMessage("PENDING_APPROVAL")]);
  assert.equal(pending.executed, false);
  assert.equal(pending.status, "BLOCKED");
  assert.deepEqual(pending.files, []);

  const mixed = outreach.export([
    makeMessage("PENDING_APPROVAL"),
    { ...makeMessage("APPROVED"), id: "outreach_2" }
  ]);
  assert.equal(mixed.executed, true);
  assert.equal(mixed.status, "COMPLETE");
  assert.equal(mixed.total, 1);
  assert.equal(mixed.files.length, 2);

  const csv = fs.readFileSync(mixed.files[0], "utf8");
  const txt = fs.readFileSync(mixed.files[1], "utf8");
  assert(csv.includes("outreach_2"));
  assert(!csv.includes("outreach_1"));
  assert(txt.includes("Status: APPROVED"));
  assert(!txt.includes("Status: PENDING_APPROVAL"));

  console.log("Outreach approval boundary contract tests: PASS");
} finally {
  fs.rmSync(exportDir, { recursive: true, force: true });
}
