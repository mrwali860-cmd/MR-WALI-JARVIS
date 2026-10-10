'use strict';

const PLATFORMS = Object.freeze([
  'youtube', 'youtube-shorts', 'facebook', 'instagram', 'tiktok', 'linkedin', 'x'
]);
const GOALS = Object.freeze(['views', 'followers', 'leads', 'sales', 'clients', 'revenue']);
const STATUSES = Object.freeze(['draft', 'needs_review', 'approved', 'rejected', 'published']);

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function createContentDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('input must be an object');
  }
  const brand = requireText(input.brand, 'brand');
  const audience = requireText(input.audience, 'audience');
  const topic = requireText(input.topic, 'topic');
  const language = requireText(input.language, 'language');
  const platform = requireText(input.platform, 'platform').toLowerCase();
  const goal = requireText(input.goal, 'goal').toLowerCase();
  if (!PLATFORMS.includes(platform)) throw new RangeError(`Unsupported platform: ${platform}`);
  if (!GOALS.includes(goal)) throw new RangeError(`Unsupported goal: ${goal}`);

  const title = `${topic} | ${brand}`;
  const hook = `For ${audience}: what should you know about ${topic}?`;
  const script = [
    hook,
    `The key idea: ${topic} matters because it affects ${audience}.`,
    'Explain one practical point, show a concrete example, and avoid unsupported claims.',
    goal === 'leads' || goal === 'clients' || goal === 'sales' || goal === 'revenue'
      ? 'Call to action: invite interested viewers to ask for the next step.'
      : 'Call to action: invite viewers to share a useful question or follow for more.'
  ].join('\n\n');
  const draft = {
    id: `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    brand, audience, topic, language, platform, goal,
    title,
    caption: `${hook}\n\n${topic}: one practical takeaway for ${audience}.\n\n${script.split('\n\n').at(-1)}`,
    script,
    hashtags: topic.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 3).map(tag => `#${tag}`),
    status: 'draft',
    approvalRequired: true,
    published: false,
    createdAt: new Date().toISOString()
  };
  return { ...draft, quality: evaluateDraft(draft) };
}

function evaluateDraft(draft) {
  if (!draft || typeof draft !== 'object') throw new TypeError('draft must be an object');
  const checks = [
    { id: 'has-title', pass: typeof draft.title === 'string' && draft.title.trim().length >= 5, message: 'Title must be at least 5 characters.' },
    { id: 'has-caption', pass: typeof draft.caption === 'string' && draft.caption.trim().length >= 20, message: 'Caption must be at least 20 characters.' },
    { id: 'has-script', pass: typeof draft.script === 'string' && draft.script.trim().length >= 40, message: 'Script must be at least 40 characters.' },
    { id: 'has-audience', pass: typeof draft.audience === 'string' && draft.audience.trim().length > 0, message: 'Target audience is required.' },
    { id: 'approval-gate', pass: draft.approvalRequired === true && draft.status !== 'approved', message: 'A draft must remain behind an explicit approval gate.' },
    { id: 'not-published', pass: draft.published !== true, message: 'This foundation cannot publish externally.' }
  ];
  const failures = checks.filter(check => !check.pass);
  return { passed: failures.length === 0, score: Math.round((checks.length - failures.length) / checks.length * 100), checks, failures };
}

function approveDraft(draft, decision, reviewer) {
  if (!draft || typeof draft !== 'object') throw new TypeError('draft must be an object');
  if (!['approve', 'reject'].includes(decision)) throw new RangeError('decision must be approve or reject');
  const approvedBy = requireText(reviewer, 'reviewer');
  return {
    ...draft,
    status: decision === 'approve' ? 'approved' : 'rejected',
    approval: { decision, reviewer: approvedBy, decidedAt: new Date().toISOString() },
    published: false
  };
}

module.exports = { PLATFORMS, GOALS, STATUSES, createContentDraft, evaluateDraft, approveDraft };
