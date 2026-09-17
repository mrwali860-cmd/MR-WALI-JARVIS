"use strict";

const { ApifyClient } = require("apify-client");

/**
 * Prospect Discovery Live - Level 1
 * Finds real Dubai Real Estate agencies via Apify Google Maps.
 * System does the work. Human only approves later.
 */
class ProspectDiscoveryLive {
  constructor(options = {}) {
    this.token = process.env.APIFY_TOKEN || options.token || null;
    this.limit = options.limit || 15;
    this.query = options.query || "real estate agency Dubai";
  }

  async discover(options = {}) {
    const query = options.query || this.query;
    const limit = options.limit || this.limit;

    if (!this.token) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "APIFY_TOKEN missing in .env",
        prospects: []
      };
    }

    console.log(`[ProspectDiscoveryLive] Searching: "${query}" | Limit: ${limit}`);

    try {
      const client = new ApifyClient({ token: this.token });

      const run = await client.actor("compass/crawler-google-places").call({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: limit,
        language: "en",
        scrapePlaceDetailPage: true
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      const prospects = (items || []).map((item, index) => ({
        id: `prospect_${index + 1}`,
        name: item.title || item.name || "Unknown",
        address: item.address || "",
        phone: item.phone || item.phoneUnformatted || "",
        website: item.website || "",
        rating: item.totalScore || item.rating || null,
        reviews_count: item.reviewsCount || 0,
        category: item.categoryName || "Real Estate Agency",
        place_id: item.placeId || "",
        source: "Apify Google Maps",
        status: "NEW",
        created_at: new Date().toISOString()
      }));

      return {
        executed: true,
        status: "COMPLETE",
        mode: "LIVE",
        query,
        total_found: prospects.length,
        prospects,
        message: `Found ${prospects.length} real prospects.`
      };
    } catch (error) {
      console.error("[ProspectDiscoveryLive] Error:", error.message);
      return {
        executed: false,
        status: "FAILED",
        message: error.message,
        prospects: []
      };
    }
  }
}

module.exports = ProspectDiscoveryLive;
