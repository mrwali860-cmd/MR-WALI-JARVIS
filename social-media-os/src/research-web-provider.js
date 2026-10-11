'use strict';

const DEFAULT_ENDPOINT = 'https://api.tavily.com/search';

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

async function searchWeb(query, options = {}) {
  const normalizedQuery = requireText(query, 'query');
  const apiKey = requireText(options.apiKey ?? process.env.TAVILY_API_KEY, 'TAVILY_API_KEY');
  const maxResults = options.maxResults ?? 5;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10) {
    throw new RangeError('maxResults must be an integer from 1 to 10');
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  let parsedEndpoint;
  try { parsedEndpoint = new URL(endpoint); }
  catch { throw new TypeError('endpoint must be a valid HTTPS URL'); }
  if (parsedEndpoint.protocol !== 'https:') throw new TypeError('endpoint must use HTTPS');

  const response = await fetchImpl(parsedEndpoint.href, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: normalizedQuery,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
      include_raw_content: false
    }),
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(options.timeoutMs ?? 12000)
      : undefined
  });

  if (!response || !response.ok) {
    const status = response && Number.isInteger(response.status) ? response.status : 'unknown';
    throw new Error(`Web search provider request failed (HTTP ${status})`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.results)) {
    throw new Error('Web search provider returned an invalid response');
  }

  const seen = new Set();
  const results = [];
  for (const item of payload.results) {
    if (!item || typeof item !== 'object' || typeof item.url !== 'string') continue;
    let url;
    try { url = new URL(item.url); } catch { continue; }
    if (url.protocol !== 'https:' || seen.has(url.href)) continue;
    if (typeof item.title !== 'string' || !item.title.trim()) continue;
    const notes = typeof item.content === 'string' ? item.content.trim() : '';
    if (!notes) continue;
    seen.add(url.href);
    results.push({
      title: item.title.trim(),
      url: url.href,
      notes,
      score: Number.isFinite(item.score) ? item.score : null
    });
    if (results.length >= maxResults) break;
  }

  return {
    query: normalizedQuery,
    provider: 'tavily',
    retrievedAt: new Date().toISOString(),
    results,
    limitations: [
      'Search snippets are leads for research, not proof that a claim is true.',
      'Open and check original sources before using factual claims in public content.'
    ]
  };
}

module.exports = { searchWeb };
