// Lab 7 - Backend API client (REST + JWT)
//
// All /api/* requests must carry a Bearer JWT obtained from POST /token.
// Tokens expire in 1 minute (per lab spec) — the client will auto-refresh
// using the role/permissions chosen via setIdentity().

const DEFAULT_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';

const IDENTITY_KEY = 'gat-api-identity-v1';

let identity = readIdentity();
let cachedToken = null;
let cachedExpiresAt = 0;
let cachedPermissions = null;
let inflightToken = null;
let online = false;
const subscribers = new Set();
const errorSubscribers = new Set();

const ROLE_PERMS = {
  ADMIN: ['READ', 'WRITE', 'DELETE'],
  WRITER: ['READ', 'WRITE'],
  VISITOR: ['READ'],
};

function effectivePermissions() {
  if (Array.isArray(cachedPermissions)) return cachedPermissions;
  if (Array.isArray(identity.permissions) && identity.permissions.length) {
    return identity.permissions.map((p) => String(p).toUpperCase());
  }
  const role = (identity.role || '').toUpperCase();
  return ROLE_PERMS[role] ?? ROLE_PERMS.VISITOR;
}

function readIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { role: 'ADMIN', permissions: null, subject: 'demo-user' };
}

function writeIdentity() {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {}
}

function notify() {
  for (const fn of subscribers) fn(getStatus());
}

export function getStatus() {
  return {
    baseUrl: DEFAULT_BASE,
    online,
    role: identity.role,
    permissions: effectivePermissions(),
    expiresAt: cachedExpiresAt,
    hasToken: !!cachedToken,
  };
}

export function subscribe(fn) {
  subscribers.add(fn);
  fn(getStatus());
  return () => subscribers.delete(fn);
}

export function subscribeErrors(fn) {
  errorSubscribers.add(fn);
  return () => errorSubscribers.delete(fn);
}

export function emitError(message, type = 'error') {
  const toast = { id: Date.now() + Math.random(), message, type };
  for (const fn of errorSubscribers) fn(toast);
}

export function setIdentity(next) {
  identity = { ...identity, ...next };
  writeIdentity();
  cachedToken = null;
  cachedExpiresAt = 0;
  cachedPermissions = null;
  notify();
}

async function fetchToken() {
  const res = await fetch(`${DEFAULT_BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: identity.role || undefined,
      permissions: identity.permissions || undefined,
      subject: identity.subject || 'demo-user',
    }),
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status})`);
  return res.json();
}

async function getToken() {
  const now = Date.now();
  // Refresh 5s early so requests don't fail mid-flight.
  if (cachedToken && cachedExpiresAt - 5_000 > now) return cachedToken;
  if (inflightToken) return inflightToken;
  inflightToken = fetchToken()
    .then((data) => {
      cachedToken = data.token;
      cachedExpiresAt = data.expiresAt ?? now + 60_000;
      cachedPermissions = Array.isArray(data.permissions) ? data.permissions : null;
      online = true;
      notify();
      return cachedToken;
    })
    .catch((err) => {
      cachedToken = null;
      cachedExpiresAt = 0;
      cachedPermissions = null;
      online = false;
      notify();
      throw err;
    })
    .finally(() => {
      inflightToken = null;
    });
  return inflightToken;
}

async function authedFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
      authorization: `Bearer ${token}`,
    },
  });
  // If the token expired between issuance and request, retry once.
  if (res.status === 401) {
    cachedToken = null;
    cachedExpiresAt = 0;
    const retryToken = await getToken();
    return fetch(`${DEFAULT_BASE}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...options.headers,
        authorization: `Bearer ${retryToken}`,
      },
    });
  }
  return res;
}

async function readJsonOrThrow(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function ping() {
  try {
    const res = await fetch(`${DEFAULT_BASE}/health`);
    online = res.ok;
  } catch {
    online = false;
  }
  notify();
  return online;
}

const COLLECTIONS = ['library', 'planner', 'wishlist', 'history', 'hidden'];

async function listCollection(name, { limit = 200, offset = 0 } = {}) {
  const res = await authedFetch(`/api/${name}?limit=${limit}&offset=${offset}`);
  const data = await readJsonOrThrow(res);
  return data?.items ?? [];
}

export async function fetchAllCollections() {
  const result = {};
  await Promise.all(
    COLLECTIONS.map(async (name) => {
      result[name] = await listCollection(name);
    })
  );
  online = true;
  notify();
  return result;
}

export async function createEntry(collection, entry) {
  const res = await authedFetch(`/api/${collection}`, { method: 'POST', body: JSON.stringify(entry) });
  return readJsonOrThrow(res);
}

export async function updateEntry(collection, appid, patch) {
  const res = await authedFetch(`/api/${collection}/${appid}`, { method: 'PUT', body: JSON.stringify(patch) });
  return readJsonOrThrow(res);
}

export async function deleteEntry(collection, appid) {
  const res = await authedFetch(`/api/${collection}/${appid}`, { method: 'DELETE' });
  if (res.status === 404) return; // tolerated — local cache may be ahead
  await readJsonOrThrow(res);
}

export async function refreshToken() {
  cachedToken = null;
  cachedExpiresAt = 0;
  return getToken();
}

export const API_BASE_URL = DEFAULT_BASE;
