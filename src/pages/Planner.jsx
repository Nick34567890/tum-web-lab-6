import { useState, useCallback } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { useNotification } from '../hooks/useNotification.js';
import { useNotificationChecker } from '../hooks/useNotificationChecker.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';
import { GameEditModal } from '../components/GameEditModal.jsx';
import { NotificationCenter } from '../components/NotificationCenter.jsx';

export default function Planner() {
  const { library, planner, wishlist, removeFromPlanner, removeFromWishlist, updatePlannerGame, updateWishlistGame, inLibrary, markGameAsPlayed } = useGameLists();
  const { notifications, addNotification, removeNotification } = useNotification();
  const [editingGame, setEditingGame] = useState(null);
  const [editingListType, setEditingListType] = useState(null);

  const handlePlayNotification = useCallback((game) => {
    addNotification(`Time to play ${game.name}! 🎮`, 'success', 8000);
  }, [addNotification]);

  const handleBuyNotification = useCallback((game) => {
    addNotification(`Time to buy ${game.name}! 🛒`, 'success', 8000);
  }, [addNotification]);

  useNotificationChecker(planner, handlePlayNotification, 'play');
  useNotificationChecker(wishlist, handleBuyNotification, 'buy');

  const handleEdit = (game, listType) => {
    setEditingGame(game);
    setEditingListType(listType);
  };

  const handleSaveEdit = (updates) => {
    if (editingListType === 'planner') {
      updatePlannerGame(editingGame.appid, updates);
    } else if (editingListType === 'wishlist') {
      updateWishlistGame(editingGame.appid, updates);
    }
    addNotification('Settings saved!', 'success', 3000);
  };

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
        onEdit={(game) => handleEdit(game, 'planner')}
        onDone={markGameAsPlayed}
        emptyHint='Add games here from the Dashboard ⋮ → "Plan to play".'
      />

      <Section
        title="Plan to buy"
        items={wishlist}
        onRemove={removeFromWishlist}
        onEdit={(game) => handleEdit(game, 'wishlist')}
        emptyHint='Paid games can be added from the Dashboard ⋮ → "Plan to buy".'
      />

      {editingGame && (
        <GameEditModal
          game={editingGame}
          onSave={handleSaveEdit}
          onClose={() => setEditingGame(null)}
          isInLibrary={inLibrary(editingGame.appid)}
          listType={editingListType}
        />
      )}

      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}

function Section({ title, items, onRemove, onEdit, onDone, emptyHint }) {
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
              className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col hover:border-blue-500 transition"
            >
              <a
                href={steamStorePage(g.appid)}
                target="_blank"
                rel="noreferrer"
                className="block w-full h-32 bg-surface2"
              >
                <img src={steamHeader(g.appid)} alt={g.name} className="w-full h-full object-cover" />
              </a>
              <div className="flex-1 p-3 flex flex-col">
                <div className="font-medium text-sm line-clamp-1">{g.name}</div>
                <div className="text-[11px] text-muted">{g.developer}</div>
                
                {/* Display badges */}
                <div className="mt-2 space-y-1">
                  {g.notificationDateTime && (
                    <div className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      🔔 {new Date(g.notificationDateTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  {g.wantToBuy && (
                    <div className="text-[11px] bg-green-500/20 text-green-300 px-2 py-1 rounded">
                      🛒 Want to buy
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(g)}
                    className="flex-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded transition"
                  >
                    Edit
                  </button>
                  {title === 'Plan to play' && onDone && (
                    <button
                      type="button"
                      onClick={() => onDone(g.appid)}
                      className="flex-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded transition"
                    >
                      Done
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(g.appid)}
                    className="flex-1 text-[11px] text-muted hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-500/10 transition"
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
