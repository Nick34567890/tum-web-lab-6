import { useGameLists } from '../hooks/useGameLists.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

export default function Library() {
  const { library, removeFromLibrary } = useGameLists();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="text-muted">
          Games you've added to your collection. Filtering, ratings and reviews come in upcoming
          steps.
        </p>
      </header>

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
              className="rounded-lg border border-border bg-surface overflow-hidden flex"
            >
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
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => removeFromLibrary(g.appid)}
                    className="text-[11px] text-muted hover:text-text"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
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
