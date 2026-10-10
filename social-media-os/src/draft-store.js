'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

async function appendDraft(filePath, draft) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath must be a non-empty string');
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new TypeError('draft must be an object');
  const absolutePath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.appendFile(absolutePath, `${JSON.stringify(draft)}\n`, { encoding: 'utf8', flag: 'a' });
  return { filePath: absolutePath, saved: true };
}

async function readDrafts(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath must be a non-empty string');
  try {
    const raw = await fs.readFile(path.resolve(filePath), 'utf8');
    const records = raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch { throw new Error(`Invalid draft record at line ${index + 1}`); }
    });
    // The file is append-only; return the latest state for each stable draft ID.
    const latest = new Map();
    for (const record of records) {
      if (typeof record.id !== 'string' || !record.id) throw new Error('Draft record is missing a stable ID');
      latest.set(record.id, record);
    }
    return [...latest.values()];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

module.exports = { appendDraft, readDrafts };
