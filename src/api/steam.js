import { FALLBACK_TOP_GAMES, FREE_APPIDS } from '../data/fallbackTopGames.js';

const STEAMSPY_TOP = 'https://steamspy.com/api.php?request=top100in2weeks';

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
