'use strict';

const { searchWeb } = require('../src/research-web-provider');

async function main() {
  const query = process.argv.slice(2).join(' ').trim() ||
    'AI tools that save time for small businesses in 2026';

  try {
    const result = await searchWeb(query, { maxResults: 5 });
    const domains = [...new Set(result.results.map(item => {
      try { return new URL(item.url).hostname; } catch { return null; }
    }).filter(Boolean))];

    process.stdout.write(JSON.stringify({
      status: result.results.length > 0 ? 'LIVE_SEARCH_SUCCESS' : 'LIVE_SEARCH_NO_RESULTS',
      provider: result.provider,
      query: result.query,
      resultCount: result.results.length,
      domains,
      retrievedAt: result.retrievedAt,
      note: 'Search snippets are leads; verify original sources before publishing. API key is never printed.'
    }, null, 2) + '\n');

    if (result.results.length === 0) process.exitCode = 2;
  } catch (error) {
    // Print only sanitized error metadata; never print request headers or credentials.
    const message = String(error && error.message || 'Unknown error');
    const code = error && error.cause && typeof error.cause.code === 'string'
      ? error.cause.code
      : null;
    const causeMessage = error && error.cause && typeof error.cause.message === 'string'
      ? error.cause.message.replace(/tvly-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 180)
      : null;
    process.stderr.write('LIVE_SEARCH_FAILED: ' + message +
      (code ? ' | CODE: ' + code : '') +
      (causeMessage ? ' | CAUSE: ' + causeMessage : '') + '\\n');
    process.exitCode = 1;
  }
}

main();
