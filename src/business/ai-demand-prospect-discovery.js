"use strict";

/**
 * AI Demand Prospect Discovery
 *
 * Finds companies showing current AI hiring demand in a target market.
 * Network access stays outside the core normalization contract: this module
 * only converts provider search results into deterministic demand records.
 */
const COMPANY_HINTS = [
  /\bat\s+([A-Z][^|–—-]{2,80})/i,
  /\bjobs?\s+at\s+([A-Z][^|–—-]{2,80})/i
];

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function extractCompany(item) {
  if (text(item.company)) return item.company.trim();
  const title = text(item.title) ? item.title.trim() : "";
  for (const pattern of COMPANY_HINTS) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  const sourceUrl = item.sourceUrl || item.url || item.link || item.jobUrl || "";\n  if (text(sourceUrl)) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      if (host && !/^(indeed|linkedin|wellfound|glassdoor|bayt|naukrigulf)\./i.test(host)) {
        return host.split(".")[0];
      }
    } catch {}
  }
  return "";
}

function normalizeItem(item, index, query) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const title = item.title || item.jobTitle || "";
  const url = item.url || item.link || item.jobUrl || "";
  const company = extractCompany(item);
  if (!text(title) || !text(url) || !company) return null;

  return {
    identity: `${company.toLowerCase()}|${String(title).toLowerCase()}|${String(url).toLowerCase()}`,
    company,
    job_title: String(title).trim(),
    url: String(url).trim(),
    snippet: text(item.snippet) ? item.snippet.trim() : "",
    source: text(item.source) ? item.source.trim() : "Google Search",
    search_query: query,
    demand_signal: "ACTIVE_AI_HIRING"
  };
}

class AiDemandProspectDiscovery {
  constructor(options = {}) {
    this.token = Object.prototype.hasOwnProperty.call(options, "token")
      ? options.token
      : (process.env.APIFY_TOKEN || null);
    this.actor = options.actor || process.env.AI_DEMAND_SEARCH_ACTOR || "searchapi~google-search-scraper";
    this.queries = options.queries || [
      'Dubai "AI Engineer" hiring',
      'Dubai "AI Developer" hiring',
      'Dubai "AI Automation" developer hiring'
    ];
    this.limit = Number(options.limit || process.env.AI_DEMAND_MAX_RESULTS || 20);
    this.pollMs = Number(options.pollMs || process.env.APIFY_POLL_MS || 3000);
    this.timeoutMs = Number(options.timeoutMs || process.env.APIFY_TIMEOUT_MS || 10 * 60 * 1000);
  }

  async discover() {
    if (!this.token) {
      return { executed: false, status: "BLOCKED", message: "APIFY_TOKEN missing in .env", prospects: [] };
    }
    if (!Number.isInteger(this.limit) || this.limit < 1 || this.limit > 100) {
      return { executed: false, status: "BLOCKED", message: "limit must be between 1 and 100", prospects: [] };
    }

    const all = [];
    for (const query of this.queries) {
      const items = await this.search(query);
      all.push(...items);
    }

    const seen = new Set();
    const prospects = [];
    for (const item of all) {
      const normalized = normalizeItem(item, prospects.length, item.__query || "");
      if (!normalized || seen.has(normalized.identity)) continue;
      seen.add(normalized.identity);
      prospects.push(normalized);
      if (prospects.length >= this.limit) break;
    }

    return {
      executed: true,
      status: "COMPLETE",
      mode: "LIVE",
      target_market: "Dubai, UAE",
      total_found: prospects.length,
      prospects,
      evidence: {
        provider: this.actor,
        queries: this.queries,
        demand_signal: "ACTIVE_AI_HIRING",
        external_action_performed: false
      }
    };
  }

  async search(query) {
    const start = await this.apify(`/acts/${this.actor}/runs?token=${encodeURIComponent(this.token)}`, {
      method: "POST",
      body: JSON.stringify({
        query,
        maxItems: Math.min(this.limit, 100),
        country: "AE",
        language: "en"
      })
    });

    const runId = start?.data?.id;
    const datasetId = start?.data?.defaultDatasetId;
    if (!runId || !datasetId) throw new Error("APIFY_INVALID_RUN_RESPONSE");

    const completed = await this.waitForRun(runId);
    if (completed.status !== "SUCCEEDED") throw new Error(`APIFY_RUN_${completed.status}`);

    const result = await this.apify(`/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`);
    return (Array.isArray(result) ? result : []).map(item => ({ ...item, __query: query }));
  }

  async waitForRun(runId) {
    const started = Date.now();
    while (Date.now() - started < this.timeoutMs) {
      const result = await this.apify(`/actor-runs/${encodeURIComponent(runId)}`);
      const status = result?.data?.status;
      if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) return result.data;
      await new Promise(resolve => setTimeout(resolve, this.pollMs));
    }
    throw new Error("APIFY_TIMEOUT: actor run did not finish within configured timeout");
  }

  async apify(pathname, options = {}) {
    const response = await fetch(`https://api.apify.com/v2${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { data = { raw: body }; }
    if (!response.ok) {
      throw new Error(`APIFY_${response.status}: ${data?.error?.message || data?.message || "request failed"}`);
    }
    return data;
  }
}

module.exports = { AiDemandProspectDiscovery, normalizeItem };
