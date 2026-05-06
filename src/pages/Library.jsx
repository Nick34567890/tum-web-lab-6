import { useState } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

export default function Library() {
  const { library, planner, removeFromLibrary, addToPlanner, updatePlannerGame, inPlanner } = useGameLists();
  const { canWrite, canDelete, role } = usePermissions();
  const [scheduleGame, setScheduleGame] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  const openSchedule = (game) => {
    setScheduleGame(game);
    const plannedGame = planner.find((item) => item.appid === game.appid);
    setScheduledDateTime(plannedGame?.notificationDateTime || game.notificationDateTime || '');
  };

  const saveSchedule = () => {
    if (!scheduleGame) return;
    const nextValues = {
      notificationDateTime: scheduledDateTime || null,
      wantToBuy: false,
    };

    if (inPlanner(scheduleGame.appid)) {
      updatePlannerGame(scheduleGame.appid, nextValues);
    } else {
      addToPlanner(scheduleGame, nextValues);
    }
    setScheduleGame(null);
    setScheduledDateTime('');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="text-muted">
          Games you've added to your collection. Filtering, ratings and reviews come in upcoming
          steps.
        </p>
      </header>

      {!canWrite && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          You're signed in as <span className="font-semibold">{role || 'VISITOR'}</span> — read-only mode. Switch role in the top bar to add, edit, or remove games.
        </div>
      )}

      {library.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          hint="Open the Dashboard, click the ⋮ on any game tile, then choose “Add to library”."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {library.map((g) => (
            <div
              key={g.appid}
              className="rounded-lg border border-border bg-surface overflow-hidden flex relative"
            >
              {canWrite && (
                <button
                  type="button"
                  onClick={() => openSchedule(g)}
                  className={`absolute top-2 right-2 z-10 rounded-md px-2 py-1 text-[10px] font-semibold shadow-md transition ${
                    inPlanner(g.appid)
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {inPlanner(g.appid) ? '✓ Planned' : 'Plan play'}
                </button>
              )}
              <a
                href={steamStorePage(g.appid)}
                target="_blank"
                rel="noreferrer"
                className="block w-32 shrink-0 bg-surface2"
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
                {canDelete && (
                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      onClick={() => removeFromLibrary(g.appid)}
                      className="text-[11px] text-muted hover:text-text"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {scheduleGame && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Plan play time</h3>
              <p className="text-sm text-muted mt-1">{scheduleGame.name}</p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Select date and time</span>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveSchedule}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save to Planner
              </button>
              <button
                type="button"
                onClick={() => setScheduleGame(null)}
                className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm font-medium text-text hover:bg-surface3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="p-8 rounded-lg border border-dashed border-border bg-surface">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted mt-1">{hint}</div>
    </div>
  );
}
