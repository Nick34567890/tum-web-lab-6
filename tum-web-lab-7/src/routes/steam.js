import { Router } from 'express';

const router = Router();

const STEAMSPY_BASE = 'https://steamspy.com/api.php';
const STEAMSPY_PAGE_SIZE = 1000;

// In-memory cache: SteamSpy "all" page index → { ts, games[] }
const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

function normalize(entry) {
  const ccu = Number(entry.ccu ?? 0);
  const priceCents = Number(entry.price ?? 0);
  const appid = Number(entry.appid);
  return {
    appid,
    name: entry.name,
    developer: entry.developer || 'Unknown',
    publisher: entry.publisher || '',
    ccu,
    owners: typeof entry.owners === 'string' ? entry.owners : '',
    averageForever: Number(entry.average_forever ?? 0),
    average2Weeks: Number(entry.average_2weeks ?? 0),
    price: priceCents > 0 ? priceCents / 100 : 0,
    isFree: priceCents === 0,
    score: Number(entry.userscore ?? 0),
  };
}

async function fetchSteamSpyPage(page) {
  const cached = cache.get(page);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.games;
  const res = await fetch(`${STEAMSPY_BASE}?request=all&page=${page}`);
  if (!res.ok) throw new Error(`SteamSpy responded ${res.status}`);
  const data = await res.json();
  const games = Object.values(data)
    .map(normalize)
    .filter((g) => g.appid && g.name)
    .sort((a, b) => b.ccu - a.ccu);
  cache.set(page, { ts: Date.now(), games });
  return games;
}

// GET /api/steam/games?page=1&pageSize=50
// Public (no JWT) — purely a CORS-friendly proxy for the dashboard.
router.get('/games', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(req.query.pageSize ?? '50', 10) || 50));
    const globalStart = (page - 1) * pageSize;
    const ssPage = Math.floor(globalStart / STEAMSPY_PAGE_SIZE);
    const offset = globalStart % STEAMSPY_PAGE_SIZE;

    const first = await fetchSteamSpyPage(ssPage);
    let chunk = first.slice(offset, offset + pageSize);

    if (chunk.length < pageSize && first.length === STEAMSPY_PAGE_SIZE) {
      try {
        const next = await fetchSteamSpyPage(ssPage + 1);
        chunk = chunk.concat(next.slice(0, pageSize - chunk.length));
      } catch {
        /* end of catalog */
      }
    }

    res.json({
      page,
      pageSize,
      count: chunk.length,
      hasMore: chunk.length === pageSize,
      source: 'steamspy',
      items: chunk,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/top', async (_req, res, next) => {
  try {
    const r = await fetch(`${STEAMSPY_BASE}?request=top100in2weeks`);
    if (!r.ok) throw new Error(`SteamSpy responded ${r.status}`);
    const data = await r.json();
    const games = Object.values(data)
      .map(normalize)
      .filter((g) => g.appid && g.name)
      .sort((a, b) => b.ccu - a.ccu);
    res.json({ count: games.length, source: 'steamspy', items: games });
  } catch (err) {
    next(err);
  }
});

export default router;
