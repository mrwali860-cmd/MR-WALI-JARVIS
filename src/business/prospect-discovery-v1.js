const REQUIRED = ['request_id', 'target_market', 'search_context', 'provider_results'];
const FIELDS = ['provider','provider_record_id','company','website','phone','email','city','country','category'];
const text = value => typeof value === 'string' && value.trim().length > 0;

function identity(record) {
  if (text(record.provider) && text(record.provider_record_id)) return `${record.provider.trim()}:${record.provider_record_id.trim()}`;
  if (text(record.company) && text(record.website)) return `company:${record.company.trim().toLowerCase()}|website:${record.website.trim().toLowerCase()}`;
  return null;
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  if (Object.keys(record).some(key => !FIELDS.includes(key)) || !text(record.company)) return null;
  const id = identity(record);
  if (!id) return null;
  const out = { identity: id, company: record.company.trim() };
  for (const field of FIELDS.filter(f => f !== 'company')) if (text(record[field])) out[field] = record[field].trim();
  return out;
}

class ProspectDiscoveryV1 {
  discover(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return this.reject('INVALID_REQUEST');
    for (const field of REQUIRED) if (!(field in input)) return this.reject(`MISSING_${field.toUpperCase()}`);
    if (!text(input.request_id) || !text(input.target_market)) return this.reject('INVALID_REQUEST_ID_OR_TARGET_MARKET');
    if (!input.search_context || typeof input.search_context !== 'object' || Array.isArray(input.search_context)) return this.reject('INVALID_SEARCH_CONTEXT');
    if (!Array.isArray(input.provider_results)) return this.reject('INVALID_PROVIDER_RESULTS');
    const prospects = [], seen = new Set();
    let rejected = 0;
    for (const record of input.provider_results) {
      const item = normalizeRecord(record);
      if (!item || seen.has(item.identity)) { rejected++; continue; }
      seen.add(item.identity); prospects.push(item);
    }
    return { request_id: input.request_id, status: 'READY', prospects, rejected_count: rejected,
      evidence: { deterministic: true, external_execution: false, provider_result_count: input.provider_results.length, accepted_count: prospects.length, rejected_count: rejected } };
  }
  reject(reason) { return { request_id: null, status: 'REJECTED', prospects: [], rejected_count: 0, reason, evidence: { deterministic: true, external_execution: false } }; }
}

module.exports = { ProspectDiscoveryV1, normalizeRecord };
