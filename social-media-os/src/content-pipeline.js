'use strict';

const { createContentStrategy } = require('./strategy-agent');
const { createContentDraft, evaluateDraft } = require('./content-engine');

function buildDraftPipeline({ brand, audience, goal, platform = 'youtube-shorts', language = 'English', cadencePerWeek = 3, researchRecord }) {
  if (!researchRecord || !Array.isArray(researchRecord.results) || researchRecord.results.length === 0) {
    throw new TypeError('A saved research record with at least one source is required');
  }
  const strategy = createContentStrategy({
    brand,
    goal,
    platforms: [platform],
    cadencePerWeek,
    researchBrief: {
      topic: researchRecord.query,
      audience,
      sources: researchRecord.results.map((source, index) => ({
        id: 'source_' + (index + 1),
        title: source.title,
        url: source.url
      }))
    }
  });
  const drafts = strategy.weeklyPlan.map(slot => {
    const draft = createContentDraft({
      brand,
      audience,
      topic: slot.topic + ' — ' + slot.pillar,
      language,
      platform: slot.platform,
      goal: slot.objective
    });
    const linked = {
      ...draft,
      strategyId: strategy.id,
      researchId: researchRecord.id,
      strategySlot: slot.slot,
      sourceUrls: slot.sourceUrls,
      status: 'draft',
      approvalRequired: true,
      published: false
    };
    return { ...linked, quality: evaluateDraft(linked) };
  });
  return {
    status: 'draft_only',
    publishingEnabled: false,
    humanApprovalRequired: true,
    basedOnResearchId: researchRecord.id,
    strategy,
    draftCount: drafts.length,
    drafts
  };
}

module.exports = { buildDraftPipeline };
