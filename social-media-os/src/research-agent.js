'use strict';

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function createResearchBrief(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('input must be an object');
  }
  const topic = requireText(input.topic, 'topic');
  const audience = requireText(input.audience, 'audience');
  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new TypeError('sources must contain at least one source with notes');
  }

  const seenUrls = new Set();
  const sources = input.sources.map((source, index) => {
    if (!source || typeof source !== 'object') throw new TypeError(`sources[${index}] must be an object`);
    const title = requireText(source.title, `sources[${index}].title`);
    const notes = requireText(source.notes, `sources[${index}].notes`);
    let parsed;
    try { parsed = new URL(requireText(source.url, `sources[${index}].url`)); }
    catch { throw new TypeError(`sources[${index}].url must be a valid HTTPS URL`); }
    if (parsed.protocol !== 'https:') throw new TypeError(`sources[${index}].url must use HTTPS`);
    if (seenUrls.has(parsed.href)) throw new TypeError('source URLs must be unique');
    seenUrls.add(parsed.href);
    return {
      id: `source_${index + 1}`,
      title,
      url: parsed.href,
      notes,
      accessedAt: source.accessedAt ? requireText(source.accessedAt, `sources[${index}].accessedAt`) : null
    };
  });

  const claims = input.claims === undefined ? [] : input.claims;
  if (!Array.isArray(claims)) throw new TypeError('claims must be an array');
  const checkedClaims = claims.map((claim, index) => {
    if (!claim || typeof claim !== 'object') throw new TypeError(`claims[${index}] must be an object`);
    const text = requireText(claim.text, `claims[${index}].text`);
    if (!Array.isArray(claim.sourceUrls) || claim.sourceUrls.length === 0) {
      throw new TypeError(`claims[${index}] must cite at least one source URL`);
    }
    const cited = [...new Set(claim.sourceUrls.map(url => requireText(url, `claims[${index}].sourceUrls`)))];
    const unknown = cited.filter(url => !seenUrls.has(new URL(url).href));
    if (unknown.length) throw new TypeError(`claims[${index}] cites a URL not included in sources`);
    return { text, sourceUrls: cited, evidenceStatus: 'source-linked; human verification required' };
  });

  const questions = input.questions === undefined ? [] : input.questions;
  if (!Array.isArray(questions)) throw new TypeError('questions must be an array');
  const researchQuestions = questions.map((q, i) => requireText(q, `questions[${i}]`));

  return {
    id: `research_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    topic,
    audience,
    createdAt: new Date().toISOString(),
    status: 'research_intake_complete',
    sources,
    claims: checkedClaims,
    researchQuestions,
    summary: sources.map(source => ({ sourceId: source.id, notes: source.notes })),
    limitations: [
      'This module organizes user-supplied source notes; it does not fetch or independently verify web pages.',
      'Source-linked claims still require human fact-checking before publication.',
      'No audience-demand or competitor-performance claim is inferred without evidence.'
    ],
    readyForContentPlanning: sources.length > 0 && checkedClaims.every(claim => claim.sourceUrls.length > 0)
  };
}

module.exports = { createResearchBrief };
