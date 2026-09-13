"use strict";

class ProspectDiscoveryLive {
  constructor(options = {}) {
    this.token = process.env.APIFY_TOKEN || options.token;
    this.limit = options.limit || 15;
    this.query = options.query || "real estate agency Dubai";
    this.actor = options.actor || "compass~crawler-google-places";
  }

  async apify(pathname, init = {}) {
    const response = await fetch(`https://api.apify.com/v2${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { data = { message: body }; }
    if (!response.ok) {
      throw new Error(`APIFY_${response.status}: ${data?.error?.message || data?.message || "request failed"}`);
    }
    return data;
  }

  normalize(item, index) {
    return {
      id: `prospect_${index + 1}`,
      name: item.title || item.name || "Unknown",
      address: item.address || "",
      phone: item.phone || item.phoneUnformatted || "",
      website: item.website || "",
      rating: item.totalScore ?? item.rating ?? null,
      reviews_count: item.reviewsCount || 0,
      category: item.categoryName || "Real Estate Agency",
      place_id: item.placeId || item.place_id || "",
      source: "Apify Google Maps",
      status: "NEW"
    };
  }

  async discover(options = {}) {
    const query = options.query || this.query;
    const limit = options.limit || this.limit;
    if (!this.token) return { executed: false, status: "BLOCKED", message: "APIFY_TOKEN missing in .env", prospects: [] };
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return { executed: false, status: "BLOCKED", message: "Prospect limit must be between 1 and 100", prospects: [] };
    }

    try {
      const response = await this.apify(`/acts/${encodeURIComponent(this.actor)}/runs`, {
        method: "POST",
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: limit,
          language: "en",
          includeWebResults: false,
          scrapePlaceDetailPage: true
        })
      });
      const run = response.data;
      if (!run?.id || !run?.defaultDatasetId) throw new Error("APIFY_INVALID_RUN_RESPONSE");

      const deadline = Date.now() + 10 * 60 * 1000;
      let status = run.status;
      while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
        if (Date.now() >= deadline) throw new Error("APIFY_TIMEOUT: actor run exceeded 10 minutes");
        await new Promise(resolve => setTimeout(resolve, 3000));
        status = (await this.apify(`/actor-runs/${encodeURIComponent(run.id)}`)).data.status;
      }
      if (status !== "SUCCEEDED") throw new Error(`APIFY_RUN_${status}`);

      const itemsResponse = await this.apify(`/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json`);
      const items = Array.isArray(itemsResponse) ? itemsResponse : [];
      const prospects = items.map((item, index) => this.normalize(item, index));
      return {
        executed: true,
        status: "COMPLETE",
        mode: "LIVE",
        query,
        total_found: prospects.length,
        prospects,
        message: `Found ${prospects.length} real prospects from Google Maps.`
      };
    } catch (error) {
      console.error("[ProspectDiscoveryLive] Error:", error.message);
      return { executed: false, status: "FAILED", message: error.message, prospects: [] };
    }
  }
}

module.exports = ProspectDiscoveryLive;
