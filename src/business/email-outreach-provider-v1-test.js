"use strict";

const assert = require("assert");
const { EmailOutreachProviderV1 } = require("./email-outreach-provider-v1");

(async () => {
  const blocked = new EmailOutreachProviderV1({ enabled: false });
  const blockedResult = await blocked.sendApproved([]);
  assert.strictEqual(blockedResult.status, "BLOCKED");

  const provider = new EmailOutreachProviderV1({
    enabled: true,
    apiKey: "test-key",
    from: "sales@example.com"
  });
  assert.strictEqual(provider.validateMessage({ status: "PENDING_APPROVAL" }), false);
  assert.strictEqual(provider.validateMessage({
    status: "APPROVED",
    email: "hello@example.com",
    subject: "Test",
    body: "Hello"
  }), true);

  console.log("email-outreach-provider-v1-test: PASS");
})();
