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

test('generates hashtags for Urdu and other Unicode topics', () => {
  const draft = createContentDraft({ ...input, topic: 'مصنوعی ذہانت کاروبار', language: 'Urdu' });
  assert.deepEqual(draft.hashtags, ['#مصنوعی', '#ذہانت', '#کاروبار']);
});

test('preserves Urdu and other Unicode hashtags', () => {
  const urduDraft = createContentDraft({ ...input, topic: 'مصنوعی ذہانت کاروبار' , language: 'Urdu' });
  assert.deepEqual(urduDraft.hashtags, ['#مصنوعی', '#ذہانت', '#کاروبار']);
  const mixedDraft = createContentDraft({ ...input, topic: 'AI کاروبار 2026' });
  assert.deepEqual(mixedDraft.hashtags, ['#ai', '#کاروبار', '#2026']);
});

test('generates Urdu and bilingual drafts', () => {
  const urduDraft = createContentDraft({ ...input, topic: 'مصنوعی ذہانت کاروبار', language: 'Urdu' });
  assert.match(urduDraft.script, /اہم بات/);
  assert.match(urduDraft.caption, /مصنوعی ذہانت کاروبار/);
  assert.deepEqual(urduDraft.hashtags, ['#مصنوعی', '#ذہانت', '#کاروبار']);

  const bilingualDraft = createContentDraft({ ...input, language: 'English + Urdu' });
  assert.match(bilingualDraft.script, /Key idea \/ اہم بات/);
  assert.match(bilingualDraft.script, /For small business owners/);
});

const { createResearchBrief } = require('../src/research-agent');

test('research brief requires HTTPS sources and ties claims to listed evidence', () => {
  const brief = createResearchBrief({
    topic: 'AI tools for small businesses',
    audience: 'small business owners',
    sources: [
      { title: 'Official guide', url: 'https://example.com/guide', notes: 'Explains workflow automation.' },
      { title: 'Research report', url: 'https://example.org/report', notes: 'Discusses adoption barriers.' }
    ],
    claims: [
      { text: 'Automation can reduce repetitive work.', sourceUrls: ['https://example.com/guide'] }
    ],
    questions: ['Which tasks are repetitive?', 'What evidence supports the claimed benefit?']
  });
  assert.equal(brief.status, 'research_intake_complete');
  assert.equal(brief.sources.length, 2);
  assert.equal(brief.claims[0].evidenceStatus, 'source-linked; human verification required');
  assert.equal(brief.readyForContentPlanning, true);
  assert.match(brief.limitations[0], /does not fetch/);
});

test('research brief rejects insecure, duplicate, or unlisted evidence URLs', () => {
  const base = { topic: 'AI', audience: 'owners', sources: [{ title: 'Guide', url: 'https://example.com/guide', notes: 'Notes' }] };
  assert.throws(() => createResearchBrief({ ...base, sources: [{ ...base.sources[0], url: 'http://example.com/guide' }] }), /HTTPS/);
  assert.throws(() => createResearchBrief({ ...base, sources: [base.sources[0], base.sources[0]] }), /unique/);
  assert.throws(() => createResearchBrief({ ...base, claims: [{ text: 'Unsupported', sourceUrls: ['https://unknown.example/x'] }] }), /not included in sources/);
  assert.throws(() => createResearchBrief({ topic: 'AI', audience: 'owners', sources: [] }), /at least one source/);
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

const fsSync = require('node:fs');
const testStoreDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'social-media-os-server-'));
process.env.SOCIAL_MEDIA_OS_STORE_PATH = path.join(testStoreDir, 'drafts.jsonl');
const { createServer } = require('../src/server');

test('local dashboard API creates, lists, and reviews drafts without publishing', async () => {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const base = 'http://127.0.0.1:' + address.port;
  try {
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).publishingEnabled, false);

    const createdResponse = await fetch(base + '/api/drafts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).draft;
    assert.equal(created.published, false);

    const approvedResponse = await fetch(base + '/api/drafts/' + encodeURIComponent(created.id) + '/approval', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'approve', reviewer: 'test-owner' })
    });
    assert.equal(approvedResponse.status, 200);
    assert.equal((await approvedResponse.json()).draft.status, 'approved');

    const listed = await (await fetch(base + '/api/drafts')).json();
    assert.equal(listed.count, 1);
    assert.equal(listed.drafts[0].status, 'approved');
    assert.equal(listed.drafts[0].published, false);

    const duplicateReview = await fetch(base + '/api/drafts/' + encodeURIComponent(created.id) + '/approval', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'reject', reviewer: 'test-owner' })
    });
    assert.equal(duplicateReview.status, 409);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fsSync.rmSync(testStoreDir, { recursive: true, force: true });
    delete process.env.SOCIAL_MEDIA_OS_STORE_PATH;
  }
});
