import { useGameLists } from '../hooks/useGameLists.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

export default function Planner() {
  const { planner, wishlist, removeFromPlanner, removeFromWishlist } = useGameLists();

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
        <p className="text-muted">
          Games you've planned to play, plus a wishlist of titles you want to buy.
        </p>
      </header>

      <Section
        title="Plan to play"
        items={planner}
        onRemove={removeFromPlanner}
        emptyHint="Add games here from the Dashboard ⋮ → “Plan to play”."
      />

      <Section
        title="Plan to buy"
        items={wishlist}
        onRemove={removeFromWishlist}
        emptyHint="Paid games can be added from the Dashboard ⋮ → “Plan to buy”."
      />
    </div>
  );
}

function Section({ title, items, onRemove, emptyHint }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {items.length === 0 ? (
        <div className="p-6 rounded-lg border border-dashed border-border bg-surface text-sm text-muted">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((g) => (
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
                <img src={steamHeader(g.appid)} alt={g.name} className="w-full h-full object-cover" />
              </a>
              <div className="flex-1 p-3 flex flex-col">
                <div className="font-medium text-sm line-clamp-1">{g.name}</div>
                <div className="text-[11px] text-muted">{g.developer}</div>
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => onRemove(g.appid)}
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
    </section>
  );
}
