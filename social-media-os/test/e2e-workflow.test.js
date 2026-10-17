'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('E2E: research -> bilingual strategy -> saved drafts -> production brief -> approval, without publishing', async () => {
  // Isolate persistent stores before importing the server module.
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-media-os-e2e-'));
  process.env.SOCIAL_MEDIA_OS_STORE_PATH = path.join(tempDir, 'drafts.jsonl');
  process.env.SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH = path.join(tempDir, 'research.jsonl');
  const { createServer } = require('../src/server');
  const server = createServer({
    researchSearch: async (query, options) => ({
      query,
      provider: 'e2e-mock',
      retrievedAt: new Date().toISOString(),
      results: [
        {
          title: 'Official AI documentation',
          url: 'https://example.com/ai-guide',
          notes: 'A source lead about practical AI workflows.',
          score: 0.95
        },
        {
          title: 'Small business technology guide',
          url: 'https://example.org/small-business-ai',
          notes: 'A source lead about applying AI in small businesses.',
          score: 0.87
        }
      ].slice(0, options.maxResults || 5),
      limitations: ['E2E uses a mock provider; live Tavily is not tested.']
    })
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (route, body) => {
    const response = await fetch(base + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    assert.ok(response.ok, route + ' returned HTTP ' + response.status + ': ' + JSON.stringify(payload));
    return payload;
  };

  try {
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.ok, true);
    assert.equal(health.publishingEnabled, false);

    const research = await post('/api/research/search', {
      query: 'Practical AI tools for Pakistani beginners',
      maxResults: 2
    });
    assert.equal(research.provider, 'e2e-mock');
    assert.equal(research.results.length, 2);

    const strategy = await post('/api/strategy/plan', {
      brand: 'Mr Wali AI Lab',
      audience: 'Urdu and English speaking AI beginners',
      goal: 'followers',
      platform: 'youtube-shorts',
      cadencePerWeek: 3
    });
    assert.equal(strategy.weeklyPlan.length, 3);
    assert.equal(strategy.basedOnResearchId, research.id);
    assert.ok(strategy.weeklyPlan.every(slot => slot.sourceUrls.length === 1 && ['https://example.com/ai-guide', 'https://example.org/small-business-ai'].includes(slot.sourceUrls[0])));

    const pipeline = await post('/api/pipeline/run', {
      brand: 'Mr Wali AI Lab',
      audience: 'Urdu and English speaking AI beginners',
      goal: 'followers',
      platform: 'youtube-shorts',
      language: 'English + Urdu',
      cadencePerWeek: 3
    });
    assert.equal(pipeline.status, 'draft_only');
    assert.equal(pipeline.publishingEnabled, false);
    assert.equal(pipeline.humanApprovalRequired, true);
    assert.equal(pipeline.draftCount, 3);
    assert.ok(pipeline.drafts.every(draft => draft.status === 'draft' && draft.published === false));
    assert.ok(pipeline.drafts.every(draft => draft.language === 'English + Urdu'));
    assert.ok(pipeline.drafts.every(draft => draft.sourceUrls.length === 1 && ['https://example.com/ai-guide', 'https://example.org/small-business-ai'].includes(draft.sourceUrls[0])));
    assert.ok(pipeline.drafts.every(draft => draft.researchContext.length === 1));
    assert.ok(pipeline.drafts.every(draft => draft.researchContext[0].notes.length > 0));
    assert.ok(pipeline.drafts.every(draft => draft.researchVerification.status === 'unverified_search_leads'));
    assert.ok(pipeline.drafts.every(draft => draft.researchVerification.claimsVerified === false));
    assert.ok(pipeline.drafts.every(draft => draft.researchVerification.requiredBeforePublishing === true));
    assert.ok(pipeline.drafts.every(draft => draft.editorialEvidenceReview.status === 'pending'));
    assert.ok(pipeline.drafts.every(draft => draft.editorialEvidenceReview.scriptUsesResearchNotes === false));
    assert.ok(pipeline.drafts.every(draft => draft.editorialEvidenceReview.sourceNotesAreLeadsOnly === true));
    assert.ok(pipeline.drafts.every(draft => draft.editorialEvidenceReview.checklist.length === 4));

    const draft = pipeline.drafts[0];
    const production = await post('/api/drafts/' + encodeURIComponent(draft.id) + '/production-brief', {
      format: 'vertical-short'
    });
    assert.equal(production.sourceDraftId, draft.id);
    assert.equal(production.brief.aspectRatio, '9:16');
    assert.equal(production.brief.requiresHumanReview, true);
    assert.equal(production.brief.mediaRendered, false);
    assert.equal(production.brief.uploaded, false);
    assert.ok(production.brief.scenes.length >= 2);

    const approval = await post('/api/drafts/' + encodeURIComponent(draft.id) + '/approval', {
      decision: 'approve',
      reviewer: 'e2e-test-reviewer'
    });
    assert.equal(approval.draft.status, 'approved');
    assert.equal(approval.draft.published, false);

    const listing = await (await fetch(base + '/api/drafts')).json();
    assert.equal(listing.count, 3);
    const reviewedDraft = listing.drafts.find(item => item.id === draft.id);
    assert.equal(reviewedDraft.status, 'approved');
    assert.equal(reviewedDraft.published, false);
    assert.ok(listing.drafts.every(item => item.published === false));

    const history = await (await fetch(base + '/api/research/history')).json();
    assert.equal(history.count, 1);
    assert.equal(history.records[0].id, research.id);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.SOCIAL_MEDIA_OS_STORE_PATH;
    delete process.env.SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH;
  }
});
