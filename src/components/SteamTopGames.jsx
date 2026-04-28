import { useEffect, useState } from 'react';
import { fetchTopGames } from '../api/steam.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';
import GameActionsMenu from './GameActionsMenu.jsx';

function formatCcu(n) {
  if (!n || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function GameTile({ game, rank }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="group relative rounded-lg overflow-hidden bg-surface border border-border hover:border-accent transition-colors flex flex-col">
      <a
        href={steamStorePage(game.appid)}
        target="_blank"
        rel="noreferrer"
        className="relative aspect-[460/215] bg-surface2 overflow-hidden block"
        title={`${game.name} on Steam`}
      >
        {!imgFailed ? (
          <img
            src={steamHeader(game.appid)}
            alt={game.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            no cover
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
          #{rank}
        </div>
        {game.isFree && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
            FREE
          </div>
        )}
      </a>
      <div className="px-3 py-2 flex-1 flex flex-col gap-0.5 relative">
        <div className="text-sm font-medium text-text leading-tight line-clamp-1 pr-8">
          {game.name}
        </div>
        <div className="text-[11px] text-muted line-clamp-1 pr-8">{game.developer}</div>
        <div className="mt-auto pt-1 text-[11px] text-muted flex items-center gap-2">
          <span className="text-accent">●</span>
          <span>{formatCcu(game.ccu)} playing</span>
        </div>
        <div className="absolute right-2 bottom-2">
          <GameActionsMenu game={game} />
        </div>
      </div>
    </div>
  );
}

export default function SteamTopGames({ limit = 50 }) {
  const [state, setState] = useState({ status: 'loading', games: [], source: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetchTopGames(limit).then((res) => {
      if (cancelled) return;
      setState({ status: 'ready', games: res.games, source: res.source, error: res.error || null });
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Top {limit} on Steam right now</h2>
          <p className="text-sm text-muted">
            Live from SteamSpy — sorted by current concurrent players. Click a cover to open the
            Steam page, or the <span className="font-mono">⋮</span> menu to add it to your library
            or plans.
          </p>
        </div>
        <div className="text-xs text-muted">
          {state.status === 'loading' && 'Loading…'}
          {state.status === 'ready' && state.source === 'steamspy' && 'Source: SteamSpy (live)'}
          {state.status === 'ready' && state.source === 'fallback' && (
            <span title={state.error || ''}>Source: bundled fallback</span>
          )}
        </div>
      </header>

      {state.status === 'loading' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[460/280] rounded-lg bg-surface2 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {state.games.map((game, idx) => (
            <GameTile key={game.appid} game={game} rank={idx + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
