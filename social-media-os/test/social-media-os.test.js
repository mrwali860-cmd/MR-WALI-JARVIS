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

const { searchWeb } = require('../src/research-web-provider');

test('web search adapter validates and normalizes provider results', async () => {
  let sentBody;
  const result = await searchWeb('AI tools for small businesses', {
    apiKey: 'test-key-not-real',
    maxResults: 2,
    fetchImpl: async (url, options) => {
      sentBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { title: 'Guide', url: 'https://example.com/guide', content: 'Useful notes', score: 0.91 },
            { title: 'Duplicate', url: 'https://example.com/guide', content: 'Duplicate notes', score: 0.8 },
            { title: 'Unsafe', url: 'http://example.org/page', content: 'Must be ignored', score: 0.7 },
            { title: 'Report', url: 'https://example.org/report', content: 'More notes', score: 0.8 }
          ]
        })
      };
    }
  });
  assert.equal(sentBody.query, 'AI tools for small businesses');
  assert.equal(sentBody.max_results, 2);
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.results.map(item => item.url), ['https://example.com/guide', 'https://example.org/report']);
  assert.ok(result.limitations.length > 0);
});

test('web search adapter rejects missing keys, insecure endpoints, and failed providers', async () => {
  await assert.rejects(searchWeb('AI', { apiKey: '', fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) }) }), /TAVILY_API_KEY/);
  await assert.rejects(searchWeb('AI', { apiKey: 'fake', endpoint: 'http://example.com/search', fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) }) }), /HTTPS/);
  await assert.rejects(searchWeb('AI', { apiKey: 'fake', fetchImpl: async () => ({ ok: false, status: 401 }) }), /HTTP 401/);
  await assert.rejects(searchWeb('AI', { apiKey: 'fake', endpoint: 'https://attacker.example/search', fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) }) }), /official Tavily/);
  await assert.rejects(searchWeb('AI', { apiKey: 'fake', maxResults: 99, fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) }) }), /maxResults/);
});

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

const { createContentStrategy } = require('../src/strategy-agent');

test('strategy planner creates a source-linked weekly plan', () => {
  const strategy = createContentStrategy({
    brand: 'Sample Brand',
    goal: 'leads',
    platforms: ['youtube-shorts', 'instagram'],
    cadencePerWeek: 4,
    researchBrief: {
      topic: 'Practical AI workflows',
      audience: 'small business owners',
      sources: [
        { id: 'source_1', title: 'Official guide', url: 'https://example.com/guide' },
        { id: 'source_2', title: 'Research report', url: 'https://example.org/report' }
      ]
    }
  });
  assert.equal(strategy.status, 'plan_draft');
  assert.equal(strategy.requiresHumanReview, true);
  assert.equal(strategy.weeklyPlan.length, 4);
  assert.equal(strategy.weeklyPlan[0].sourceUrls[0], 'https://example.com/guide');
  assert.equal(strategy.weeklyPlan[0].objective, 'leads');
  assert.equal(strategy.measurementPlan.primaryMetric, 'qualified leads');
  assert.ok(strategy.contentPillars.length >= 3);
});

test('strategy planner rejects unsupported goals, platforms, and missing research sources', () => {
  const researchBrief = { topic: 'AI', audience: 'owners', sources: [{ title: 'Guide', url: 'https://example.com/guide' }] };
  assert.throws(() => createContentStrategy({ brand: 'B', goal: 'viral', researchBrief }), /Unsupported goal/);
  assert.throws(() => createContentStrategy({ brand: 'B', goal: 'leads', platforms: ['unknown'], researchBrief }), /Unsupported platform/);
  assert.throws(() => createContentStrategy({ brand: 'B', goal: 'leads', researchBrief: { topic: 'AI', audience: 'owners', sources: [] } }), /at least one source/);
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

const { appendResearch, readResearch } = require('../src/research-store');

test('research history persists and returns newest records first', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-media-os-research-'));
  const file = path.join(dir, 'research.jsonl');
  try {
    await appendResearch(file, { id: 'r1', query: 'first', results: [] });
    await appendResearch(file, { id: 'r2', query: 'second', results: [] });
    await appendResearch(file, { id: 'r1', query: 'first updated', results: [] });
    const records = await readResearch(file, 10);
    assert.deepEqual(records.map(record => record.query), ['first updated', 'second']);
    assert.deepEqual((await readResearch(file, 1)).map(record => record.query), ['first updated']);
    await assert.rejects(readResearch(file, 0), /limit/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

const fsSync = require('node:fs');
const testStoreDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'social-media-os-server-'));
process.env.SOCIAL_MEDIA_OS_STORE_PATH = path.join(testStoreDir, 'drafts.jsonl');
process.env.SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH = path.join(testStoreDir, 'research.jsonl');
const { createServer } = require('../src/server');

test('dashboard research API returns normalized search results', async () => {
  const server = createServer({
    researchSearch: async (query, options) => ({
      query,
      provider: 'test',
      results: [{ title: 'Verified later', url: 'https://example.com/research', notes: 'Source snippet', score: 0.7 }],
      receivedMaxResults: options.maxResults
    })
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const response = await fetch(base + '/api/research/search', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'AI for small business', maxResults: 3 })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.query, 'AI for small business');
    assert.equal(data.results[0].url, 'https://example.com/research');
    assert.equal(data.receivedMaxResults, 3);
    const historyResponse = await fetch(base + '/api/research/history');
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json();
    assert.equal(history.count, 1);
    assert.equal(history.records[0].query, 'AI for small business');
    assert.equal(history.records[0].results[0].url, 'https://example.com/research');
    const invalid = await fetch(base + '/api/research/search', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '', maxResults: 3 })
    });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

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
    delete process.env.SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH;
  }
});
