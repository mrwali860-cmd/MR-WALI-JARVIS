'use strict';

const path = require('node:path');
const { createContentDraft } = require('./content-engine');
const { appendDraft, readDrafts } = require('./draft-store');

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    if (name === 'list') { values.list = true; continue; }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`);
    values[name] = value;
    i += 1;
  }
  return values;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const storePath = path.join(process.cwd(), 'data', 'drafts.jsonl');
  if (args.list) {
    const drafts = await readDrafts(storePath);
    process.stdout.write(`${JSON.stringify({ count: drafts.length, drafts }, null, 2)}\n`);
    return;
  }
  const draft = createContentDraft({
    brand: args.brand,
    audience: args.audience,
    topic: args.topic,
    language: args.language || 'English',
    platform: args.platform || 'youtube-shorts',
    goal: args.goal || 'leads'
  });
  const saved = await appendDraft(storePath, draft);
  process.stdout.write(`${JSON.stringify({ saved: saved.saved, filePath: saved.filePath, draft }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`Social Media OS: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs };
