const assert = require('node:assert/strict');
const { ProspectDiscoveryV1 } = require('./prospect-discovery-v1');

const agent = new ProspectDiscoveryV1();

function request(results) {
  return {
    request_id: 'req-001',
    target_market: 'REAL_ESTATE',
    search_context: { city: 'Dubai', category: 'real_estate' },
    provider_results: results
  };
}

const valid = {
  provider: 'test-provider',
  provider_record_id: 'p-1',
  company: 'Demo Realty',
  website: 'https://example.com',
  city: 'Dubai',
  country: 'UAE'
};

{
  const result = agent.discover(request([valid]));
  assert.equal(result.status, 'READY');
  assert.equal(result.prospects.length, 1);
  assert.equal(result.prospects[0].company, 'Demo Realty');
  assert.equal(result.evidence.deterministic, true);
  assert.equal(result.evidence.external_execution, false);
}

{
  const result = agent.discover(request([valid, { ...valid }]));
  assert.equal(result.prospects.length, 1);
  assert.equal(result.rejected_count, 1);
}

{
  const result = agent.discover(request([{ company: 'No Stable Identity' }]));
  assert.equal(result.prospects.length, 0);
  assert.equal(result.rejected_count, 1);
}

{
  const result = agent.discover(request([{ ...valid, secret: 'must-not-pass' }]));
  assert.equal(result.prospects.length, 0);
  assert.equal(result.rejected_count, 1);
}

{
  const result = agent.discover({ request_id: 'req-001', target_market: 'REAL_ESTATE' });
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.prospects.length, 0);
}

{
  const input = request([valid]);
  const first = agent.discover(input);
  const second = agent.discover(input);
  assert.deepEqual(first, second);
}

console.log('Prospect Discovery V1 tests passed');
