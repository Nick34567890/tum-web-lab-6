import { useCallback, useEffect, useState } from 'react';

const KEY = 'gat-lists-v1';

const empty = () => ({ library: [], planner: [], wishlist: [], history: [] });

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
    };
  } catch {
    return empty();
  }
}

const subscribers = new Set();
let cache = read();

function notify() {
  subscribers.forEach((fn) => fn(cache));
}

function persist(next) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

function upsert(listName, game, overrides = {}) {
  const list = cache[listName];
  if (list.some((g) => g.appid === game.appid)) return;
  const entry = {
    appid: game.appid,
    name: game.name,
    developer: game.developer || '',
    addedAt: Date.now(),
    notificationDateTime: null,
    wantToBuy: false,
    completedDate: null,
    ...overrides,
  };
  persist({ ...cache, [listName]: [...list, entry] });
}

function updateInList(listName, appid, updates) {
  const list = cache[listName];
  const index = list.findIndex((g) => g.appid === appid);
  if (index === -1) return;
  const updated = { ...list[index], ...updates };
  const newList = [...list];
  newList[index] = updated;
  persist({ ...cache, [listName]: newList });
}

function removeFrom(listName, appid) {
  const list = cache[listName];
  if (!list.some((g) => g.appid === appid)) return;
  persist({ ...cache, [listName]: list.filter((g) => g.appid !== appid) });
}

function moveToHistory(appid) {
  const list = cache.planner;
  const index = list.findIndex((g) => g.appid === appid);
  if (index === -1) return;
  const game = { ...list[index], completedDate: Date.now() };
  const newPlanner = list.filter((g) => g.appid !== appid);
  persist({ ...cache, planner: newPlanner, history: [...cache.history, game] });
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

  return {
    library: state.library,
    planner: state.planner,
    wishlist: state.wishlist,
    history: state.history,
    inLibrary,
    inPlanner,
    inWishlist,
    addToLibrary: (game, overrides) => upsert('library', game, overrides),
    addToPlanner: (game, overrides) => upsert('planner', game, overrides),
    addToWishlist: (game, overrides) => upsert('wishlist', game, overrides),
    removeFromLibrary: (appid) => removeFrom('library', appid),
    removeFromPlanner: (appid) => removeFrom('planner', appid),
    removeFromWishlist: (appid) => removeFrom('wishlist', appid),
    updatePlannerGame: (appid, updates) => updateInList('planner', appid, updates),
    updateWishlistGame: (appid, updates) => updateInList('wishlist', appid, updates),
    markGameAsPlayed: (appid) => moveToHistory(appid),
  };
}
