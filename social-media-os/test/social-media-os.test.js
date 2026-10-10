'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createContentDraft, evaluateDraft, approveDraft, PLATFORMS } = require('../src/content-engine');
const { calculateMetrics } = require('../src/revenue-metrics');

const input = {
  brand: 'Sample Brand',
  audience: 'small business owners',
  topic: 'Practical AI workflows',
  language: 'English',
  platform: 'youtube-shorts',
  goal: 'leads'
};

test('creates a draft with required fields and no external publishing', () => {
  const draft = createContentDraft(input);
  assert.equal(draft.brand, input.brand);
  assert.equal(draft.platform, 'youtube-shorts');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.published, false);
  assert.equal(draft.approvalRequired, true);
  assert.equal(draft.quality.passed, true);
});

test('rejects unsupported platforms and goals', () => {
  assert.throws(() => createContentDraft({ ...input, platform: 'my-secret-platform' }), /Unsupported platform/);
  assert.throws(() => createContentDraft({ ...input, goal: 'go-viral-guaranteed' }), /Unsupported goal/);
});

test('approval decisions are explicit and do not publish', () => {
  const draft = createContentDraft(input);
  const approved = approveDraft(draft, 'approve', 'owner');
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approval.reviewer, 'owner');
  assert.equal(approved.published, false);
  assert.equal(evaluateDraft(approved).passed, true);
  const rejected = approveDraft(draft, 'reject', 'owner');
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.published, false);
  assert.throws(() => approveDraft(draft, 'maybe', 'owner'), /decision must be approve or reject/);
});

test('quality checks fail when required approval guard is missing', () => {
  const draft = createContentDraft(input);
  assert.equal(evaluateDraft({ ...draft, approvalRequired: false }).passed, false);
  assert.equal(evaluateDraft({ ...draft, published: true }).passed, false);
});

test('platform list is explicit and includes all initial channels', () => {
  for (const platform of ['youtube', 'youtube-shorts', 'facebook', 'instagram', 'tiktok', 'linkedin', 'x']) {
    assert.ok(PLATFORMS.includes(platform));
  }
});

test('calculates revenue funnel metrics without inventing zero-denominator rates', () => {
  const metrics = calculateMetrics({ views: 1000, leads: 50, clients: 5, sales: 4, revenue: 400, costs: 100 });
  assert.equal(metrics.netRevenue, 300);
  assert.equal(metrics.leadRate, 0.05);
  assert.equal(metrics.clientRate, 0.1);
  assert.equal(metrics.revenuePerLead, 8);
  assert.equal(metrics.costPerLead, 2);
  assert.equal(metrics.roi, 3);
  assert.equal(calculateMetrics({ views: 0, leads: 0 }).leadRate, null);
});

test('rejects negative or invalid financial metrics', () => {
  assert.throws(() => calculateMetrics({ revenue: -1 }), /revenue must be a finite non-negative number/);
  assert.throws(() => calculateMetrics({ costs: NaN }), /costs must be a finite non-negative number/);
});

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { appendDraft, readDrafts } = require('../src/draft-store');

test('stores drafts locally and reads them back without changing the source object', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-media-os-'));
  const filePath = path.join(tempDir, 'drafts.jsonl');
  const draft = createContentDraft(input);
  const result = await appendDraft(filePath, draft);
  assert.equal(result.saved, true);
  const records = await readDrafts(filePath);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, draft.id);
  assert.equal(records[0].published, false);
  await appendDraft(filePath, { ...draft, id: 'second-record' });
  assert.equal((await readDrafts(filePath)).length, 2);
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('returns an empty list when no local draft store exists', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-media-os-empty-'));
  assert.deepEqual(await readDrafts(path.join(tempDir, 'missing.jsonl')), []);
  await fs.rm(tempDir, { recursive: true, force: true });
});
