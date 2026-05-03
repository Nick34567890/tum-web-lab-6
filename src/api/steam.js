import { FALLBACK_TOP_GAMES, FREE_APPIDS } from '../data/fallbackTopGames.js';
import { API_BASE_URL } from './backend.js';

const STEAMSPY_TOP = 'https://steamspy.com/api.php?request=top100in2weeks';
const STEAMSPY_ALL = (page) => `https://steamspy.com/api.php?request=all&page=${page}`;
const BACKEND_GAMES = (page, pageSize) =>
  `${API_BASE_URL}/api/steam/games?page=${page}&pageSize=${pageSize}`;

const STEAMSPY_PAGE_SIZE = 1000; // SteamSpy's "all" endpoint returns up to 1000 entries per page

function normalize(entry) {
  const ccu = Number(entry.ccu ?? 0);
  const owners = typeof entry.owners === 'string' ? entry.owners : '';
  const priceCents = Number(entry.price ?? 0);
  const appid = Number(entry.appid);
  const price = priceCents > 0 ? priceCents / 100 : 0;
  return {
    appid,
    name: entry.name,
    developer: entry.developer || 'Unknown',
    publisher: entry.publisher || '',
    ccu,
    owners,
    averageForever: Number(entry.average_forever ?? 0),
    average2Weeks: Number(entry.average_2weeks ?? 0),
    price,
    isFree: price === 0 || FREE_APPIDS.has(appid),
    score: Number(entry.userscore ?? 0),
  };
}

// Top-100-in-2-weeks fetcher used by the legacy dashboard.
export async function fetchTopGames(limit = 50) {
  try {
    const res = await fetch(STEAMSPY_TOP, { mode: 'cors' });
    if (!res.ok) throw new Error(`SteamSpy responded ${res.status}`);
    const data = await res.json();
    const list = Object.values(data)
      .map(normalize)
      .filter((g) => g.appid && g.name)
      .sort((a, b) => b.ccu - a.ccu)
      .slice(0, limit);
    if (list.length === 0) throw new Error('Empty response');
    return { games: list, source: 'steamspy' };
  } catch (err) {
    return {
      games: FALLBACK_TOP_GAMES.slice(0, limit).map((g) => ({
        ...g,
        publisher: '',
        averageForever: 0,
        average2Weeks: 0,
        owners: '',
        price: 0,
        isFree: FREE_APPIDS.has(g.appid),
        score: 0,
      })),
      source: 'fallback',
      error: err.message,
    };
  }
}

// In-memory cache of SteamSpy "all" pages so paging back-and-forth doesn't refetch.
const allPageCache = new Map();
let knownLastSteamSpyPage = null; // first page index that returned < STEAMSPY_PAGE_SIZE

async function fetchSteamSpyAllPage(steamSpyPage) {
  if (allPageCache.has(steamSpyPage)) return allPageCache.get(steamSpyPage);
  const res = await fetch(STEAMSPY_ALL(steamSpyPage), { mode: 'cors' });
  if (!res.ok) throw new Error(`SteamSpy responded ${res.status}`);
  const data = await res.json();
  const games = Object.values(data)
    .map(normalize)
    .filter((g) => g.appid && g.name)
    .sort((a, b) => b.ccu - a.ccu);
  allPageCache.set(steamSpyPage, games);
  if (games.length < STEAMSPY_PAGE_SIZE) {
    knownLastSteamSpyPage = steamSpyPage;
  }
  return games;
}

function fallbackPage(uiPage, pageSize) {
  // The bundled fallback only has ~50 entries. Page 1 returns them, later
  // pages return an empty list so the UI can show "no more games".
  if (uiPage > Math.ceil(FALLBACK_TOP_GAMES.length / pageSize)) return [];
  const start = (uiPage - 1) * pageSize;
  return FALLBACK_TOP_GAMES.slice(start, start + pageSize).map((g) => ({
    ...g,
    publisher: '',
    averageForever: 0,
    average2Weeks: 0,
    owners: '',
    price: 0,
    isFree: FREE_APPIDS.has(g.appid),
    score: 0,
  }));
}

/**
 * Fetch a single page of the dashboard.
 *
 * Maps a UI page (1-indexed, `pageSize` items each) onto SteamSpy's paginated
 * "all" endpoint (1000 items per page) and slices out the requested window.
 * If the slice overflows the current SteamSpy page, the next one is fetched
 * and concatenated. Falls back to the bundled list if the network fails.
 */
export async function fetchDashboardPage(uiPage = 1, pageSize = 50) {
  if (uiPage < 1) uiPage = 1;

  // Prefer the Lab 7 backend proxy — server-to-server avoids browser CORS
  // issues with SteamSpy and gives access to the entire Steam catalog.
  try {
    const res = await fetch(BACKEND_GAMES(uiPage, pageSize));
    if (res.ok) {
      const data = await res.json();
      const items = (data.items ?? []).map((g) => ({
        ...g,
        isFree: g.isFree || FREE_APPIDS.has(g.appid),
      }));
      return {
        games: items,
        source: 'backend',
        page: uiPage,
        pageSize,
        hasMore: !!data.hasMore,
      };
    }
  } catch {
    /* backend offline — fall through to direct SteamSpy + bundled fallback */
  }

  const globalStart = (uiPage - 1) * pageSize;
  const startSteamSpyPage = Math.floor(globalStart / STEAMSPY_PAGE_SIZE);
  const offsetWithinPage = globalStart % STEAMSPY_PAGE_SIZE;

  try {
    let games = await fetchSteamSpyAllPage(startSteamSpyPage);
    let chunk = games.slice(offsetWithinPage, offsetWithinPage + pageSize);

    // Spans a SteamSpy page boundary — pull the next chunk and concat.
    if (
      chunk.length < pageSize &&
      games.length === STEAMSPY_PAGE_SIZE &&
      knownLastSteamSpyPage !== startSteamSpyPage
    ) {
      const nextPage = await fetchSteamSpyAllPage(startSteamSpyPage + 1);
      chunk = chunk.concat(nextPage.slice(0, pageSize - chunk.length));
    }

    const isLast =
      chunk.length < pageSize ||
      (knownLastSteamSpyPage !== null &&
        (uiPage * pageSize) >= (knownLastSteamSpyPage + 1) * STEAMSPY_PAGE_SIZE);

    return {
      games: chunk,
      source: 'steamspy',
      page: uiPage,
      pageSize,
      hasMore: !isLast && chunk.length === pageSize,
    };
  } catch (err) {
    const games = fallbackPage(uiPage, pageSize);
    return {
      games,
      source: 'fallback',
      page: uiPage,
      pageSize,
      hasMore: false,
      error: err.message,
    };
  }
}
