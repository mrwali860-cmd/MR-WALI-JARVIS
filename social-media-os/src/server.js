'use strict';

const http = require('node:http');
const path = require('node:path');
const { createContentDraft, approveDraft } = require('./content-engine');
const { appendDraft, readDrafts } = require('./draft-store');
const { searchWeb } = require('./research-web-provider');
const { appendResearch, readResearch } = require('./research-store');
const { createContentStrategy } = require('./strategy-agent');

const PORT = Number(process.env.SOCIAL_MEDIA_OS_PORT || 4177);
const STORE_PATH = process.env.SOCIAL_MEDIA_OS_STORE_PATH || path.join(__dirname, '..', 'data', 'drafts.jsonl');
const RESEARCH_STORE_PATH = process.env.SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH || path.join(__dirname, '..', 'data', 'research.jsonl');
const MAX_BODY_BYTES = 32 * 1024;

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

const HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Social Media OS</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18212f;background:#f4f6fa}body{margin:0}header{background:#172b4d;color:white;padding:24px max(20px,calc((100% - 1000px)/2))}header h1{margin:0 0 6px;font-size:25px}header p{margin:0;color:#d6e2f2}.wrap{max-width:1000px;margin:24px auto;padding:0 16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:18px}.panel{background:white;border:1px solid #e0e5ed;border-radius:12px;padding:20px;box-shadow:0 3px 12px #18212f0a}.panel h2{font-size:18px;margin:0 0 16px}label{display:block;font-size:13px;font-weight:650;margin:12px 0 5px}input,select,textarea{box-sizing:border-box;width:100%;border:1px solid #cbd3df;border-radius:7px;padding:10px;font:inherit;background:white}button{border:0;border-radius:7px;padding:10px 14px;background:#1d5fc4;color:white;font:inherit;font-weight:650;cursor:pointer;margin-top:14px}button.secondary{background:#e8eef7;color:#18375d;margin-left:6px}.status{font-size:13px;color:#46566e;min-height:20px;margin:10px 0}.draft{border:1px solid #e0e5ed;border-radius:9px;padding:14px;margin:12px 0}.draft h3{font-size:16px;margin:0 0 8px}.meta{font-size:12px;color:#596b82}.draft pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;max-height:260px;overflow:auto;background:#f6f8fb;padding:10px;border-radius:6px}.tag{display:inline-block;font-size:11px;background:#edf2fa;padding:4px 7px;border-radius:12px;margin-right:5px}.empty{color:#68778b;font-size:14px}.notice{font-size:12px;color:#596b82;line-height:1.5;margin-top:16px}@media(max-width:720px){.wrap{grid-template-columns:1fr}header{padding:20px}}
</style></head><body><header><h1>Social Media OS</h1><p>Draft → quality check → human review. No external publishing is enabled.</p></header>
<main class="wrap"><section class="panel"><h2>Create a content draft</h2><form id="draft-form">
<label for="brand">Brand</label><input id="brand" name="brand" required placeholder="Your brand or business">
<label for="audience">Target audience</label><input id="audience" name="audience" required placeholder="Who is this for?">
<label for="topic">Topic</label><textarea id="topic" name="topic" rows="2" required placeholder="One specific useful topic"></textarea>
<label for="language">Language</label><select id="language" name="language"><option>English</option><option>Urdu</option><option>English + Urdu</option></select>
<label for="platform">Platform</label><select id="platform" name="platform"><option value="youtube-shorts">YouTube Shorts</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="x">X</option></select>
<label for="goal">Primary goal</label><select id="goal" name="goal"><option value="leads">Leads</option><option value="clients">Clients</option><option value="sales">Sales</option><option value="revenue">Revenue</option><option value="views">Views</option><option value="followers">Followers</option></select>
<button type="submit">Generate and save draft</button></form><div id="message" class="status" role="status"></div><p class="notice">This first version uses a deterministic template, not an AI model. Saved drafts stay in this local folder. Publishing, account connections, media rendering and analytics are not connected.</p></section>
<section class="panel"><h2>Draft library</h2><div id="drafts" class="empty">Loading drafts…</div></section>
<section class="panel"><h2>Strategy Agent</h2><form id="strategy-form"><label for="strategy-brand">Brand</label><input id="strategy-brand" name="brand" required placeholder="Your brand"><label for="strategy-audience">Target audience</label><input id="strategy-audience" name="audience" required placeholder="Who do you want to reach?"><label for="strategy-goal">Primary goal</label><select id="strategy-goal" name="goal"><option value="leads">Leads</option><option value="clients">Clients</option><option value="sales">Sales</option><option value="revenue">Revenue</option><option value="views">Views</option><option value="followers">Followers</option></select><label for="strategy-platform">Platform</label><select id="strategy-platform" name="platform"><option value="youtube-shorts">YouTube Shorts</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option><option value="x">X</option></select><label for="strategy-cadence">Posts per week</label><select id="strategy-cadence" name="cadencePerWeek"><option value="3">3</option><option value="5">5</option><option value="7">7</option></select><button type="submit">Build strategy from latest research</button></form><div id="strategy-message" class="status" role="status"></div><div id="strategy-results"></div><p class="notice">Strategy is a reviewable template. It uses the latest saved research search and does not predict results.</p></section><section class="panel"><h2>Research Agent</h2><form id="research-form"><label for="research-query">Research topic or audience question</label><textarea id="research-query" name="query" rows="2" required placeholder="e.g. AI tools that save time for small businesses"></textarea><label for="research-limit">Maximum sources</label><select id="research-limit" name="maxResults"><option value="3">3 sources</option><option value="5" selected>5 sources</option><option value="10">10 sources</option></select><button type="submit">Search the web</button></form><div id="research-message" class="status" role="status"></div><div id="research-results"></div><h3>Recent research history</h3><div id="research-history" class="empty">Loading research history…</div><p class="notice">Search results are research leads, not verified facts. Check original sources before publishing. Requires TAVILY_API_KEY in the local server environment.</p></section></main>
<script>
const form=document.getElementById('draft-form'),message=document.getElementById('message'),list=document.getElementById('drafts');
const researchForm=document.getElementById('research-form'),researchMessage=document.getElementById('research-message'),researchResults=document.getElementById('research-results'),researchHistory=document.getElementById('research-history');
const strategyForm=document.getElementById('strategy-form'),strategyMessage=document.getElementById('strategy-message'),strategyResults=document.getElementById('strategy-results');
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node}
async function refreshResearchHistory(){try{const r=await fetch('/api/research/history');const data=await r.json();researchHistory.replaceChildren();if(!data.records.length){researchHistory.append(el('p','No research searches saved yet.','empty'));return}for(const record of data.records){const card=el('article',undefined,'draft');card.append(el('h3',record.query));card.append(el('div',new Date(record.retrievedAt).toLocaleString()+' · '+record.results.length+' sources','meta'));for(const source of record.results.slice(0,3)){const link=el('a',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link,el('p',source.notes))}researchHistory.append(card)}}catch(e){researchHistory.textContent='Could not load research history.'}}
async function refresh(){try{const r=await fetch('/api/drafts');const data=await r.json();list.replaceChildren();if(!data.drafts.length){list.append(el('p','No drafts yet. Create the first one.','empty'));return}for(const d of [...data.drafts].reverse()){const card=el('article',undefined,'draft');card.append(el('h3',d.title));card.append(el('div',d.platform+' · '+d.language+' · Goal: '+d.goal,'meta'));const tag=el('span',d.status,'tag');card.append(tag);card.append(el('pre',d.script));card.append(el('div','Quality: '+d.quality.score+'% · '+(d.quality.passed?'checks passed':'review required'),'meta'));if(d.status==='draft'){const row=el('div');const approve=el('button','Approve');approve.type='button';approve.onclick=()=>review(d.id,'approve');const reject=el('button','Reject','secondary');reject.type='button';reject.onclick=()=>review(d.id,'reject');row.append(approve,reject);card.append(row)}list.append(card)}}catch(e){list.textContent='Could not load drafts. Check that the local server is running.'}}
async function review(id,decision){const reviewer=window.prompt('Reviewer identifier (for audit record):');if(!reviewer||!reviewer.trim())return;const r=await fetch('/api/drafts/'+encodeURIComponent(id)+'/approval',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision,reviewer})});const data=await r.json();message.textContent=r.ok?'Review recorded: '+data.draft.status:(data.error||'Review failed');await refresh()}
researchForm.addEventListener('submit',async event=>{event.preventDefault();researchMessage.textContent='Searching…';researchResults.replaceChildren();const body=Object.fromEntries(new FormData(researchForm).entries());body.maxResults=Number(body.maxResults);try{const r=await fetch('/api/research/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Research search failed');researchMessage.textContent='Found '+data.results.length+' source leads. Verify each source before using claims.';await refreshResearchHistory();for(const source of data.results){const card=el('article',undefined,'draft');const title=el('h3',source.title);const link=el('a',source.url);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';const notes=el('p',source.notes);card.append(title,link,notes,el('div','Relevance score: '+(source.score===null?'not provided':source.score),'meta'));researchResults.append(card)}}catch(e){researchMessage.textContent=e.message}});
refreshResearchHistory();
strategyForm.addEventListener('submit',async event=>{event.preventDefault();strategyMessage.textContent='Building draft strategy…';strategyResults.replaceChildren();const body=Object.fromEntries(new FormData(strategyForm).entries());body.cadencePerWeek=Number(body.cadencePerWeek);try{const r=await fetch('/api/strategy/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Strategy planning failed');strategyMessage.textContent='Strategy draft ready. Review it before use.';strategyResults.append(el('h3',data.topic+' · '+data.measurementPlan.primaryMetric));for(const item of data.weeklyPlan){const card=el('article',undefined,'draft');card.append(el('h3','Slot '+item.slot+' · '+item.pillar));card.append(el('div',item.platform+' · '+item.format,'meta'));card.append(el('p',item.brief));const link=el('a',item.sourceUrls[0]);link.href=item.sourceUrls[0];link.target='_blank';link.rel='noopener noreferrer';card.append(link);strategyResults.append(card)}}catch(e){strategyMessage.textContent=e.message}});
form.addEventListener('submit',async event=>{event.preventDefault();message.textContent='Creating draft…';const body=Object.fromEntries(new FormData(form).entries());try{const r=await fetch('/api/drafts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not create draft');message.textContent='Draft saved. Quality score: '+data.draft.quality.score+'%';form.elements.topic.value='';await refresh()}catch(e){message.textContent=e.message}});refresh();
</script></body></html>`;

async function handler(req, res, dependencies = {}) {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(HTML);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'social-media-os', mode: 'local-draft-only', publishingEnabled: false });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/research/search') {
    const body = await readJsonBody(req);
    if (typeof body.query !== 'string' || !body.query.trim()) {
      sendJson(res, 400, { error: 'query must be a non-empty string' });
      return;
    }
    if (body.maxResults !== undefined && (!Number.isInteger(body.maxResults) || body.maxResults < 1 || body.maxResults > 10)) {
      sendJson(res, 400, { error: 'maxResults must be an integer from 1 to 10' });
      return;
    }
    const results = await (dependencies.researchSearch || searchWeb)(body.query.trim(), { maxResults: body.maxResults });
    const record = { id: 'research_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8), ...results };
    await appendResearch(RESEARCH_STORE_PATH, record);
    sendJson(res, 200, record);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/strategy/plan') {
    const body = await readJsonBody(req);
    if (typeof body.brand !== 'string' || !body.brand.trim() || typeof body.audience !== 'string' || !body.audience.trim()) {
      sendJson(res, 400, { error: 'brand and audience must be non-empty strings' }); return;
    }
    const records = await readResearch(RESEARCH_STORE_PATH, 100);
    if (!records.length) { sendJson(res, 409, { error: 'Run and save a research search before building a strategy.' }); return; }
    const latest = records[0];
    const strategy = createContentStrategy({
      brand: body.brand, goal: body.goal, platforms: [body.platform], cadencePerWeek: body.cadencePerWeek,
      researchBrief: { topic: latest.query, audience: body.audience, sources: latest.results.map((source, index) => ({ id: 'source_' + (index + 1), title: source.title, url: source.url })) }
    });
    sendJson(res, 200, { ...strategy, basedOnResearchId: latest.id });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/research/history') {
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) { sendJson(res, 400, { error: 'limit must be an integer from 1 to 100' }); return; }
    const records = await readResearch(RESEARCH_STORE_PATH, limit);
    sendJson(res, 200, { count: records.length, records });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/drafts') {
    const drafts = await readDrafts(STORE_PATH);
    sendJson(res, 200, { count: drafts.length, drafts });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/drafts') {
    const body = await readJsonBody(req);
    const draft = createContentDraft(body);
    await appendDraft(STORE_PATH, draft);
    sendJson(res, 201, { saved: true, draft });
    return;
  }
  const approvalMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/approval$/);
  if (req.method === 'POST' && approvalMatch) {
    const body = await readJsonBody(req);
    const drafts = await readDrafts(STORE_PATH);
    const index = drafts.findIndex(draft => draft.id === decodeURIComponent(approvalMatch[1]));
    if (index < 0) { sendJson(res, 404, { error: 'Draft not found' }); return; }
    if (drafts[index].status !== 'draft') { sendJson(res, 409, { error: 'Only drafts can be reviewed' }); return; }
    const reviewed = approveDraft(drafts[index], body.decision, body.reviewer);
    // Append a new event record; the latest record for an ID is the current state.
    await appendDraft(STORE_PATH, reviewed);
    sendJson(res, 200, { saved: true, draft: reviewed });
    return;
  }
  sendJson(res, 404, { error: 'Route not found' });
}

function createServer(dependencies = {}) {
  return http.createServer((req, res) => {
    handler(req, res, dependencies).catch(error => {
      if (res.headersSent || res.destroyed) return;
      const status = error.statusCode || (error instanceof TypeError || error instanceof RangeError ? 400 : 500);
      sendJson(res, status, { error: status === 500 ? 'Internal server error' : error.message });
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, '127.0.0.1', () => process.stdout.write(`Social Media OS local dashboard: http://127.0.0.1:${PORT}\n`));
}

module.exports = { createServer, handler, PORT };
