'use strict';

const { PLATFORMS, GOALS } = require('./content-engine');

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function createContentStrategy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const brand = requireText(input.brand, 'brand');
  const goal = requireText(input.goal, 'goal').toLowerCase();
  if (!GOALS.includes(goal)) throw new RangeError(`Unsupported goal: ${goal}`);
  const platforms = input.platforms === undefined ? ['youtube-shorts', 'instagram', 'facebook'] : input.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) throw new TypeError('platforms must be a non-empty array');
  const normalizedPlatforms = [...new Set(platforms.map((value, index) => {
    const platform = requireText(value, `platforms[${index}]`).toLowerCase();
    if (!PLATFORMS.includes(platform)) throw new RangeError(`Unsupported platform: ${platform}`);
    return platform;
  }))];
  const cadencePerWeek = input.cadencePerWeek === undefined ? 3 : input.cadencePerWeek;
  if (!Number.isInteger(cadencePerWeek) || cadencePerWeek < 1 || cadencePerWeek > 14) {
    throw new RangeError('cadencePerWeek must be an integer from 1 to 14');
  }
  const brief = input.researchBrief;
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) throw new TypeError('researchBrief must be a research brief object');
  const topic = requireText(brief.topic, 'researchBrief.topic');
  const audience = requireText(brief.audience, 'researchBrief.audience');
  if (!Array.isArray(brief.sources) || brief.sources.length === 0) throw new TypeError('researchBrief must include at least one source');
  const sourceIds = brief.sources.map((source, index) => {
    if (!source || typeof source !== 'object') throw new TypeError(`researchBrief.sources[${index}] must be an object`);
    const url = new URL(requireText(source.url, `researchBrief.sources[${index}].url`));
    if (url.protocol !== 'https:') throw new TypeError('research source URLs must use HTTPS');
    return { id: source.id || `source_${index + 1}`, title: requireText(source.title, `researchBrief.sources[${index}].title`), url: url.href };
  });
  const pillars = [
    { name: 'Practical education', purpose: 'Explain one useful concept with a concrete example.', share: 50 },
    { name: 'Evidence and trust', purpose: 'Answer audience questions using checked sources and clear limitations.', share: 30 },
    { name: 'Action and conversion', purpose: 'Offer a relevant next step without exaggerated promises.', share: 20 }
  ];
  const weeklyPlan = Array.from({ length: cadencePerWeek }, (_, index) => {
    const pillar = pillars[index % pillars.length];
    const source = sourceIds[index % sourceIds.length];
    return {
      slot: index + 1,
      pillar: pillar.name,
      topic,
      audience,
      platform: normalizedPlatforms[index % normalizedPlatforms.length],
      format: index % 2 === 0 ? 'short educational video' : 'carousel or text post',
      objective: goal,
      brief: pillar.purpose,
      sourceIds: [source.id],
      sourceUrls: [source.url],
      callToAction: ['leads', 'clients', 'sales', 'revenue'].includes(goal)
        ? 'Invite interested viewers to request details; do not promise results.'
        : 'Invite viewers to ask a relevant question or follow for more.'
    };
  });
  return {
    id: `strategy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    brand,
    topic,
    audience,
    goal,
    platforms: normalizedPlatforms,
    cadencePerWeek,
    createdAt: new Date().toISOString(),
    status: 'plan_draft',
    requiresHumanReview: true,
    researchSourceCount: sourceIds.length,
    sourceReferences: sourceIds,
    contentPillars: pillars,
    weeklyPlan,
    measurementPlan: {
      primaryMetric: goal === 'views' ? 'qualified views' : goal === 'followers' ? 'follower growth' : goal === 'leads' ? 'qualified leads' : goal === 'clients' ? 'new clients' : goal === 'sales' ? 'sales attributed' : 'attributed revenue',
      supportingMetrics: ['reach', 'engagement rate', 'link clicks', 'qualified conversions'],
      rule: 'Do not attribute results to content without a traceable measurement source.'
    },
    limitations: [
      'This is a deterministic planning template, not an AI-generated market strategy.',
      'Source links are carried forward as research leads; review original pages before publishing.',
      'Audience demand, competitor performance, and expected revenue are not inferred without evidence.'
    ]
  };
}

module.exports = { createContentStrategy };
