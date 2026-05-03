import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDashboardPage } from '../api/steam.js';
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

function PageButton({ children, disabled, active, onClick, title }) {
  const base = 'min-w-[2rem] px-2.5 py-1 rounded-md text-sm font-medium transition border';
  const cls = active
    ? `${base} bg-accent text-white border-accent`
    : disabled
    ? `${base} bg-surface text-muted border-border opacity-50 cursor-not-allowed`
    : `${base} bg-surface text-text border-border hover:border-accent hover:bg-surface2`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

function Paginator({ page, hasMore, onChange }) {
  const around = [page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <PageButton onClick={() => onChange(1)} disabled={page === 1} title="First page">
        «
      </PageButton>
      <PageButton onClick={() => onChange(page - 1)} disabled={page === 1} title="Previous page">
        ‹ Prev
      </PageButton>

      {around[0] > 1 && <span className="text-muted px-1">…</span>}
      {around.map((n) => (
        <PageButton key={n} active={n === page} onClick={() => onChange(n)}>
          {n}
        </PageButton>
      ))}
      {hasMore && <span className="text-muted px-1">…</span>}

      <PageButton onClick={() => onChange(page + 1)} disabled={!hasMore} title="Next page">
        Next ›
      </PageButton>
    </div>
  );
}

export default function SteamTopGames({ pageSize = 50 }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [page, setPage] = useState(initialPage);
  const [state, setState] = useState({ status: 'loading', games: [], source: null, error: null, hasMore: false });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetchDashboardPage(page, pageSize).then((res) => {
      if (cancelled) return;
      setState({
        status: 'ready',
        games: res.games,
        source: res.source,
        error: res.error || null,
        hasMore: !!res.hasMore,
      });
      // Scroll to the top of the grid for a clean "new page" feel.
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  const goToPage = (n) => {
    if (n < 1) return;
    setPage(n);
    const next = new URLSearchParams(searchParams);
    if (n === 1) next.delete('page');
    else next.set('page', String(n));
    setSearchParams(next, { replace: false });
  };

  const startRank = (page - 1) * pageSize + 1;

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Browse Steam — page {page}</h2>
          <p className="text-sm text-muted">
            Live from SteamSpy — sorted by current concurrent players. Click a cover to open the
            Steam page, or the <span className="font-mono">⋮</span> menu to add it to your library
            or plans.
          </p>
        </div>
        <div className="text-xs text-muted">
          {state.status === 'loading' && 'Loading…'}
          {state.status === 'ready' && state.source === 'backend' && (
            <>Source: Lab 7 API proxy — page {page}</>
          )}
          {state.status === 'ready' && state.source === 'steamspy' && (
            <>Source: SteamSpy (direct) — page {page}</>
          )}
          {state.status === 'ready' && state.source === 'fallback' && (
            <span title={state.error || ''}>Source: bundled fallback</span>
          )}
        </div>
      </header>

      {state.status === 'loading' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: pageSize > 20 ? 20 : pageSize }).map((_, i) => (
            <div
              key={i}
              className="aspect-[460/280] rounded-lg bg-surface2 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : state.games.length === 0 ? (
        <div className="p-8 rounded-lg border border-dashed border-border bg-surface text-center">
          <div className="font-medium">No more games on this page.</div>
          <div className="text-sm text-muted mt-1">
            Go back to{' '}
            <button
              type="button"
              onClick={() => goToPage(1)}
              className="underline hover:text-text"
            >
              page 1
            </button>
            .
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {state.games.map((game, idx) => (
            <GameTile key={game.appid} game={game} rank={startRank + idx} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pt-3">
        <div className="text-xs text-muted">
          Showing {state.games.length === 0 ? 0 : startRank}
          {state.games.length > 0 && `–${startRank + state.games.length - 1}`}
        </div>
        <Paginator page={page} hasMore={state.hasMore} onChange={goToPage} />
      </div>
    </section>
  );
}
