import { useCallback, useEffect, useState } from 'react';
import {
  createEntry,
  deleteEntry,
  emitError,
  fetchAllCollections,
  subscribe as subscribeBackend,
  updateEntry,
} from '../api/backend.js';

function describePermissionError(err, action) {
  const granted = err?.body?.granted;
  const grantedText = Array.isArray(granted) && granted.length ? granted.join(', ') : 'none';
  return `Cannot ${action}: your role only has ${grantedText} permission.`;
}

const KEY = 'gat-lists-v1';

const empty = () => ({ library: [], planner: [], wishlist: [], history: [], hidden: [] });

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      library: Array.isArray(parsed.library) ? parsed.library : [],
      planner: Array.isArray(parsed.planner) ? parsed.planner : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    };
  } catch {
    return empty();
  }
}

const subscribers = new Set();
let cache = read();
let lastBackendStatus = { online: false };

function notify() {
  subscribers.forEach((fn) => fn(cache));
}

function persistLocal(next) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

function applyServerState(server) {
  // Backend is source of truth — replace cache, but keep `history` list union'd
  // because some pages may have logged sessions while offline.
  const next = {
    library: server.library ?? cache.library,
    planner: server.planner ?? cache.planner,
    wishlist: server.wishlist ?? cache.wishlist,
    history: server.history ?? cache.history,
    hidden: server.hidden ?? cache.hidden,
  };
  persistLocal(next);
}

async function syncFromBackend() {
  try {
    const data = await fetchAllCollections();
    applyServerState(data);
  } catch (err) {
    // Backend offline — keep local cache. Logged once for visibility.
    if (typeof console !== 'undefined') console.warn('[lab7] backend sync failed:', err.message);
  }
}

subscribeBackend((status) => {
  const wasOnline = lastBackendStatus.online;
  lastBackendStatus = status;
  if (status.online && !wasOnline) {
    syncFromBackend();
  }
});

if (typeof window !== 'undefined') {
  // Kick off initial fetch (non-blocking — UI renders from localStorage first)
  syncFromBackend();
}

function buildEntry(game, overrides = {}) {
  return {
    appid: game.appid,
    name: game.name,
    developer: game.developer || '',
    addedAt: Date.now(),
    notificationDateTime: null,
    wantToBuy: false,
    completedDate: null,
    ...overrides,
  };
}

async function upsert(listName, game, overrides = {}) {
  const list = cache[listName];
  if (list.some((g) => g.appid === game.appid)) return;
  const entry = buildEntry(game, overrides);
  const prevCache = cache;
  persistLocal({ ...cache, [listName]: [...list, entry] });
  try {
    await createEntry(listName, entry);
  } catch (err) {
    if (err?.status === 409) return; // server already has it — fine
    if (err?.status === 403) {
      persistLocal(prevCache);
      emitError(describePermissionError(err, `add to ${listName}`));
      return;
    }
    persistLocal(prevCache);
    emitError(`Could not add to ${listName}: ${err.message}`);
    console.warn(`[lab7] createEntry(${listName}) failed:`, err.message);
  }
}

async function updateInList(listName, appid, updates) {
  const list = cache[listName];
  const index = list.findIndex((g) => g.appid === appid);
  if (index === -1) return;
  const updated = { ...list[index], ...updates };
  const newList = [...list];
  newList[index] = updated;
  const prevCache = cache;
  persistLocal({ ...cache, [listName]: newList });
  try {
    await updateEntry(listName, appid, updates);
  } catch (err) {
    if (err?.status === 403) {
      persistLocal(prevCache);
      emitError(describePermissionError(err, `edit ${listName} entry`));
      return;
    }
    persistLocal(prevCache);
    emitError(`Could not update ${listName}: ${err.message}`);
    console.warn(`[lab7] updateEntry(${listName}) failed:`, err.message);
  }
}

async function removeFrom(listName, appid) {
  const list = cache[listName];
  if (!list.some((g) => g.appid === appid)) return;
  const prevCache = cache;
  persistLocal({ ...cache, [listName]: list.filter((g) => g.appid !== appid) });
  try {
    await deleteEntry(listName, appid);
  } catch (err) {
    if (err?.status === 403) {
      persistLocal(prevCache);
      emitError(describePermissionError(err, `remove from ${listName}`));
      return;
    }
    persistLocal(prevCache);
    emitError(`Could not remove from ${listName}: ${err.message}`);
    console.warn(`[lab7] deleteEntry(${listName}) failed:`, err.message);
  }
}

async function moveToHistory(appid, payload = {}) {
  const list = cache.planner;
  const index = list.findIndex((g) => g.appid === appid);
  if (index === -1) return;
  const planned = list[index];
  const playedAt =
    payload.playedAt ?? (planned.notificationDateTime ? new Date(planned.notificationDateTime).getTime() : Date.now());
  const durationMinutes = Number.isFinite(payload.durationMinutes) ? payload.durationMinutes : 60;
  const game = {
    ...planned,
    completedDate: playedAt,
    playedAt,
    durationMinutes,
  };
  const newPlanner = list.filter((g) => g.appid !== appid);
  const prevCache = cache;
  persistLocal({ ...cache, planner: newPlanner, history: [...cache.history, game] });
  try {
    await deleteEntry('planner', appid);
    await createEntry('history', game);
  } catch (err) {
    if (err?.status === 409) return;
    if (err?.status === 403) {
      persistLocal(prevCache);
      emitError(describePermissionError(err, 'mark as played'));
      return;
    }
    persistLocal(prevCache);
    emitError(`Could not mark as played: ${err.message}`);
    console.warn('[lab7] moveToHistory sync failed:', err.message);
  }
}

export function useGameLists() {
  const [state, setState] = useState(cache);

  useEffect(() => {
    subscribers.add(setState);
    return () => subscribers.delete(setState);
  }, []);

  const inLibrary = useCallback((appid) => state.library.some((g) => g.appid === appid), [state]);
  const inPlanner = useCallback((appid) => state.planner.some((g) => g.appid === appid), [state]);
  const inWishlist = useCallback((appid) => state.wishlist.some((g) => g.appid === appid), [state]);
  const isHidden = useCallback((appid) => state.hidden.some((g) => g.appid === appid), [state]);

  return {
    library: state.library,
    planner: state.planner,
    wishlist: state.wishlist,
    history: state.history,
    hidden: state.hidden,
    inLibrary,
    inPlanner,
    inWishlist,
    isHidden,
    addToLibrary: (game, overrides) => upsert('library', game, overrides),
    addToPlanner: (game, overrides) => upsert('planner', game, overrides),
    addToWishlist: (game, overrides) => upsert('wishlist', game, overrides),
    removeFromLibrary: (appid) => removeFrom('library', appid),
    removeFromPlanner: (appid) => removeFrom('planner', appid),
    removeFromWishlist: (appid) => removeFrom('wishlist', appid),
    updatePlannerGame: (appid, updates) => updateInList('planner', appid, updates),
    updateWishlistGame: (appid, updates) => updateInList('wishlist', appid, updates),
    markGameAsPlayed: (appid, payload) => moveToHistory(appid, payload),
    hideFromDashboard: (game) => upsert('hidden', game),
    unhideFromDashboard: (appid) => removeFrom('hidden', appid),
  };
}
