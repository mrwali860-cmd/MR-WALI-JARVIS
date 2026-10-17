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
  const isUrdu = language.toLowerCase() === 'urdu';
  const isBilingual = language.toLowerCase() === 'english + urdu';
  const hook = isUrdu
    ? `${audience} کے لیے: ${topic} کے بارے میں کیا جاننا ضروری ہے؟`
    : isBilingual
      ? `For ${audience}: what should you know about ${topic}?\n\n${audience} کے لیے: ${topic} کے بارے میں کیا جاننا ضروری ہے؟`
      : `For ${audience}: what should you know about ${topic}?`;
  const isConversionGoal = ['leads', 'clients', 'sales', 'revenue'].includes(goal);
  const script = isUrdu
    ? [
        hook,
        `اہم بات: ${topic} اس لیے اہم ہے کیونکہ اس کا تعلق ${audience} سے ہے۔`,
        'ایک عملی نکتہ سمجھائیں، واضح مثال دیں، اور غیر مصدقہ دعووں سے گریز کریں۔',
        isConversionGoal
          ? 'اگلا قدم: دلچسپی رکھنے والے ناظرین کو مزید معلومات کے لیے رابطہ کرنے کی دعوت دیں۔'
          : 'ناظرین کو مفید سوال پوچھنے یا مزید مواد کے لیے فالو کرنے کی دعوت دیں۔'
      ].join('\n\n')
    : isBilingual
      ? [
          hook,
          `Key idea / اہم بات: ${topic} matters to ${audience}.`,
          'Explain one practical point, show a concrete example, and avoid unsupported claims. / ایک عملی نکتہ اور واضح مثال دیں، غیر مصدقہ دعووں سے گریز کریں۔',
          isConversionGoal
            ? 'Next step: invite interested viewers to ask for details. / دلچسپی رکھنے والے ناظرین کو مزید معلومات کے لیے رابطہ کرنے کی دعوت دیں۔'
            : 'Invite viewers to ask a useful question or follow for more. / ناظرین کو سوال پوچھنے یا مزید مواد کے لیے فالو کرنے کی دعوت دیں۔'
        ].join('\n\n')
      : [
          hook,
          `The key idea: ${topic} matters because it affects ${audience}.`,
          'Explain one practical point, show a concrete example, and avoid unsupported claims.',
          isConversionGoal
            ? 'Call to action: invite interested viewers to ask for the next step.'
            : 'Call to action: invite viewers to share a useful question or follow for more.'
        ].join('\n\n');
  const draft = {
    id: `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    brand, audience, topic, language, platform, goal,
    title,
    caption: `${hook}\n\n${topic}: one practical takeaway for ${audience}.\n\n${script.split('\n\n').at(-1)}`,
    script,
    hashtags: topic.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 3).map(tag => `#${tag}`),
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
    { id: 'approval-gate', pass: draft.approvalRequired === true, message: 'Explicit approval must remain enabled for all content.' },
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
