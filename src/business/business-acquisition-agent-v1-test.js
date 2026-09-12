import test from 'node:test';
import assert from 'node:assert/strict';

import { BusinessAcquisitionAgentV1 } from './business-acquisition-agent-v1.js';

const agent = new BusinessAcquisitionAgentV1();

const baseInput = {
  request_id: 'req-acq-001',
  prospect: {
    opportunity_id: 'opp-001',
    company: 'Demo Realty',
    contact: 'demo@example.com',
    market: 'REAL_ESTATE',
    problem: 'Slow lead response'
  }
};

test('qualifies a target prospect and matches the first sellable service', () => {
  const result = agent.evaluate(baseInput);

  assert.equal(result.request_id, 'req-acq-001');
  assert.equal(result.opportunity_id, 'opp-001');
  assert.equal(result.qualification, 'QUALIFIED');
  assert.equal(result.service_id, 'AI_APPOINTMENT_BOOKING_AUTOMATION');
  assert.equal(result.outreach.status, 'DRAFT');
  assert.ok(result.outreach.message);
  assert.ok(result.next_action);
});

test('is deterministic for identical input', () => {
  const first = agent.evaluate(baseInput);
  const second = agent.evaluate(baseInput);
  assert.deepEqual(second, first);
});

test('disqualifies unsupported markets without inventing a match', () => {
  const result = agent.evaluate({
    ...baseInput,
    prospect: { ...baseInput.prospect, market: 'UNSUPPORTED_MARKET' }
  });

  assert.equal(result.qualification, 'DISQUALIFIED');
  assert.equal(result.service_id, null);
  assert.equal(result.outreach.status, 'NOT_READY');
  assert.equal(result.outreach.message, null);
});

test('fails closed when required prospect context is missing', () => {
  const result = agent.evaluate({
    request_id: 'req-acq-002',
    prospect: { ...baseInput.prospect, problem: '' }
  });

  assert.equal(result.qualification, 'DISQUALIFIED');
  assert.equal(result.service_id, null);
  assert.equal(result.outreach.status, 'NOT_READY');
});

test('does not send external outreach', () => {
  const result = agent.evaluate(baseInput);
  assert.equal(result.outreach.status, 'DRAFT');
  assert.equal(result.evidence.external_execution, false);
});
