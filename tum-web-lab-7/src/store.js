import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_PATH = path.join(DATA_DIR, 'seed.json');

export const COLLECTIONS = ['library', 'planner', 'wishlist', 'history'];

let cache = null;
let writePromise = Promise.resolve();

const empty = () => ({ library: [], planner: [], wishlist: [], history: [] });

async function ensureLoaded() {
  if (cache) return cache;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    cache = sanitize(JSON.parse(raw));
    return cache;
  } catch {
    try {
      const seedRaw = await fs.readFile(SEED_PATH, 'utf8');
      cache = sanitize(JSON.parse(seedRaw));
    } catch {
      cache = empty();
    }
    await persist();
    return cache;
  }
}

function sanitize(obj) {
  const base = empty();
  for (const key of COLLECTIONS) {
    base[key] = Array.isArray(obj?.[key]) ? obj[key] : [];
  }
  return base;
}

function persist() {
  const snapshot = JSON.stringify(cache, null, 2);
  writePromise = writePromise
    .catch(() => {})
    .then(() => fs.writeFile(DB_PATH, snapshot, 'utf8'));
  return writePromise;
}

export async function listAll(collection, { limit, offset, sort } = {}) {
  const data = await ensureLoaded();
  let items = [...data[collection]];
  if (sort === 'addedAt') {
    items.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  }
  const total = items.length;
  const off = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  const lim = Number.isFinite(limit) ? Math.max(0, limit) : items.length;
  return { items: items.slice(off, off + lim), total, offset: off, limit: lim };
}

export async function findOne(collection, appid) {
  const data = await ensureLoaded();
  return data[collection].find((g) => g.appid === appid) ?? null;
}

export async function insert(collection, entry) {
  const data = await ensureLoaded();
  if (data[collection].some((g) => g.appid === entry.appid)) {
    return { ok: false, reason: 'conflict' };
  }
  data[collection] = [...data[collection], entry];
  await persist();
  return { ok: true, entry };
}

export async function update(collection, appid, patch) {
  const data = await ensureLoaded();
  const idx = data[collection].findIndex((g) => g.appid === appid);
  if (idx === -1) return { ok: false, reason: 'not_found' };
  const merged = { ...data[collection][idx], ...patch, appid };
  const next = [...data[collection]];
  next[idx] = merged;
  data[collection] = next;
  await persist();
  return { ok: true, entry: merged };
}

export async function remove(collection, appid) {
  const data = await ensureLoaded();
  const before = data[collection].length;
  data[collection] = data[collection].filter((g) => g.appid !== appid);
  if (data[collection].length === before) return { ok: false, reason: 'not_found' };
  await persist();
  return { ok: true };
}

export async function reset() {
  cache = empty();
  await persist();
}

export async function preload() {
  await ensureLoaded();
}
