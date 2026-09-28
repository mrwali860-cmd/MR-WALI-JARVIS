"use strict";

/**
 * Public Contact Enrichment V1
 * Fetches a prospect website and extracts a publicly listed email address.
 * No login, bypass, or private-data access is attempted.
 */
class PublicContactEnrichmentV1 {
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.timeoutMs = Number(options.timeoutMs || 10000);
    this.maxBytes = Number(options.maxBytes || 1000000);
  }

  async enrich(prospect = {}) {
    const website = String(prospect.website || "").trim();
    if (!/^https?:\/\//i.test(website)) {
      return { executed: false, status: "BLOCKED", reason: "PUBLIC_WEBSITE_REQUIRED", email: "" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(website, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "MR-WALI-JARVIS-PublicContactEnrichment/1.0" }
      });
      if (!response.ok) {
        return { executed: true, status: "NO_CONTACT", reason: `HTTP_${response.status}`, email: "" };
      }
      const text = await response.text();
      const html = text.slice(0, this.maxBytes);
      const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
      const emails = [...new Set(matches.map(x => x.toLowerCase()))]
        .filter(x => !/example\.(com|org|net)$/.test(x));
      return {
        executed: true,
        status: emails.length ? "COMPLETE" : "NO_CONTACT",
        email: emails[0] || "",
        candidates: emails.slice(0, 5),
        source: emails.length ? "PUBLIC_WEBSITE" : null
      };
    } catch (error) {
      return { executed: false, status: "FAILED", reason: error.name === "AbortError" ? "TIMEOUT" : error.message, email: "" };
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { PublicContactEnrichmentV1 };
