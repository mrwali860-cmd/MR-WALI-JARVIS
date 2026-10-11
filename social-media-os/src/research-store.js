'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

async function appendResearch(filePath, record) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath must be a non-empty string');
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('record must be an object');
  if (typeof record.id !== 'string' || !record.id.trim()) throw new TypeError('record.id must be a non-empty string');
  const absolutePath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.appendFile(absolutePath, JSON.stringify(record) + '\n', { encoding: 'utf8', flag: 'a' });
  return { filePath: absolutePath, saved: true };
}

async function readResearch(filePath, limit = 20) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath must be a non-empty string');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('limit must be an integer from 1 to 100');
  try {
    const raw = await fs.readFile(path.resolve(filePath), 'utf8');
    const records = raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch { throw new Error(`Invalid research record at line ${index + 1}`); }
    });
    const latest = new Map();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !record.id) throw new Error('Research record is missing a stable ID');
      latest.set(record.id, record);
    }
    return [...latest.values()].slice(-limit).reverse();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

module.exports = { appendResearch, readResearch };
