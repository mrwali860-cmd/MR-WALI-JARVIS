"use strict";

const assert = require("node:assert/strict");
const { AiDemandProspectDiscovery, normalizeItem } = require("./ai-demand-prospect-discovery");

{
  const blocked = new AiDemandProspectDiscovery({ token: null });
  blocked.discover().then(result => {
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.executed, false);
    console.log("AI Demand Prospect Discovery tests passed");
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

{
  const item = normalizeItem({
    title: "AI Engineer - Dubai",
    url: "https://example.com/jobs/ai-engineer",
    snippet: "Build AI systems in Dubai",
    source: "Google Search"
  }, 0, 'Dubai "AI Engineer" hiring');
  assert.equal(item.company, "example");
  assert.equal(item.demand_signal, "ACTIVE_AI_HIRING");
}

{
  const item = normalizeItem({
    title: "AI Engineer at Example AI",
    url: "https://example.com/jobs/ai-engineer"
  }, 0, "Dubai AI Engineer");
  assert.equal(item.company, "Example AI");
}
