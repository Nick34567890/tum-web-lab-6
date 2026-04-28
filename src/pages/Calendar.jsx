import { useMemo } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

export default function Calendar() {
  const { history } = useGameLists();

  // Filter games played in the past 2 months
  const recentGames = useMemo(() => {
    const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days in ms
    return history.filter((game) => game.completedDate && game.completedDate >= twoMonthsAgo);
  }, [history]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupedByDate = useMemo(() => {
    const groups = {};
    recentGames.forEach((game) => {
      const dateKey = formatDate(game.completedDate);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(game);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [recentGames]);

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted">
          Games you've played. View your gaming history from the past 2 months.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">History</h2>
        {recentGames.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-border bg-surface text-sm text-muted">
            No games completed in the past 2 months. Mark games as "Done" in the Planner to see them here.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDate.map(([dateKey, games]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-sm font-semibold tracking-tight text-accent">{dateKey}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.map((g) => (
                    <div
                      key={g.appid}
                      className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col"
                    >
                      <a
                        href={steamStorePage(g.appid)}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-32 bg-surface2"
                      >
                        <img
                          src={steamHeader(g.appid)}
                          alt={g.name}
                          className="w-full h-full object-cover"
                        />
                      </a>
                      <div className="flex-1 p-3 flex flex-col">
                        <div className="font-medium text-sm line-clamp-1">{g.name}</div>
                        <div className="text-[11px] text-muted">{g.developer}</div>
                        <div className="mt-auto pt-2">
                          <div className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded inline-block">
                            ✓ Completed
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
