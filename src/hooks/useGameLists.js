import { useCallback, useEffect, useState } from 'react';

const KEY = 'gat-lists-v1';

const empty = () => ({ library: [], planner: [], wishlist: [] });

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      library: Array.isArray(parsed.library) ? parsed.library : [],
      planner: Array.isArray(parsed.planner) ? parsed.planner : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
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

function upsert(listName, game) {
  const list = cache[listName];
  if (list.some((g) => g.appid === game.appid)) return;
  const entry = {
    appid: game.appid,
    name: game.name,
    developer: game.developer || '',
    addedAt: Date.now(),
  };
  persist({ ...cache, [listName]: [...list, entry] });
}

function removeFrom(listName, appid) {
  const list = cache[listName];
  if (!list.some((g) => g.appid === appid)) return;
  persist({ ...cache, [listName]: list.filter((g) => g.appid !== appid) });
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
    inLibrary,
    inPlanner,
    inWishlist,
    addToLibrary: (game) => upsert('library', game),
    addToPlanner: (game) => upsert('planner', game),
    addToWishlist: (game) => upsert('wishlist', game),
    removeFromLibrary: (appid) => removeFrom('library', appid),
    removeFromPlanner: (appid) => removeFrom('planner', appid),
    removeFromWishlist: (appid) => removeFrom('wishlist', appid),
  };
}
