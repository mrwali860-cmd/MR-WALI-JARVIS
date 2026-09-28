"use strict";

const assert = require("node:assert/strict");
const { PublicContactEnrichmentV1 } = require("./public-contact-enrichment-v1");

(async () => {
  const html = "<html><body>Contact sales@ExampleRealty.com or hello@example.org</body></html>";
  const provider = new PublicContactEnrichmentV1({
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => html })
  });
  const result = await provider.enrich({ website: "https://example-real-estate.test" });
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.email, "sales@examplerealty.com");
  assert.deepEqual(result.candidates, ["sales@examplerealty.com"]);
  const blocked = await provider.enrich({ website: "" });
  assert.equal(blocked.status, "BLOCKED");
  console.log("public contact enrichment tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
