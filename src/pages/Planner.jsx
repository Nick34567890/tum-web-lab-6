import { useState, useCallback } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useNotification } from '../hooks/useNotification.js';
import { useNotificationChecker } from '../hooks/useNotificationChecker.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';
import { GameEditModal } from '../components/GameEditModal.jsx';
import { NotificationCenter } from '../components/NotificationCenter.jsx';
import MarkPlayedModal from '../components/MarkPlayedModal.jsx';

export default function Planner() {
  const { library, planner, wishlist, removeFromPlanner, removeFromWishlist, updatePlannerGame, updateWishlistGame, inLibrary, addToLibrary, markGameAsPlayed } = useGameLists();
  const { canWrite, canDelete, role } = usePermissions();
  const { notifications, addNotification, removeNotification } = useNotification();
  const [editingGame, setEditingGame] = useState(null);
  const [editingListType, setEditingListType] = useState(null);
  const [donePromptGame, setDonePromptGame] = useState(null);
  const [buyPromptGame, setBuyPromptGame] = useState(null);

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

      {!canWrite && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          You're signed in as <span className="font-semibold">{role || 'VISITOR'}</span> — read-only mode. Switch role in the top bar to edit or remove planned games.
        </div>
      )}

      <Section
        title="Plan to play"
        items={planner}
        canWrite={canWrite}
        canDelete={canDelete}
        onRemove={removeFromPlanner}
        onEdit={(game) => handleEdit(game, 'planner')}
        onDone={(game) => setDonePromptGame(game)}
        emptyHint='Add games here from the Dashboard ⋮ → "Plan to play".'
      />

      <Section
        title="Plan to buy"
        items={wishlist}
        canWrite={canWrite}
        canDelete={canDelete}
        onRemove={removeFromWishlist}
        onEdit={(game) => handleEdit(game, 'wishlist')}
        onBuy={(game) => setBuyPromptGame(game)}
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

      {donePromptGame && (
        <MarkPlayedModal
          game={donePromptGame}
          onClose={() => setDonePromptGame(null)}
          onSave={(payload) => {
            markGameAsPlayed(donePromptGame.appid, payload);
            const hours = (payload.durationMinutes / 60).toFixed(1);
            addNotification(`Logged ${hours}h of ${donePromptGame.name}!`, 'success', 4000);
            setDonePromptGame(null);
          }}
        />
      )}

      {buyPromptGame && (
        <BuyConfirmModal
          game={buyPromptGame}
          onCancel={() => setBuyPromptGame(null)}
          onConfirm={() => {
            window.open(steamStorePage(buyPromptGame.appid), '_blank', 'noopener,noreferrer');
            if (!inLibrary(buyPromptGame.appid)) addToLibrary(buyPromptGame);
            removeFromWishlist(buyPromptGame.appid);
            addNotification(`Opened Steam to buy ${buyPromptGame.name}`, 'success', 4000);
            setBuyPromptGame(null);
          }}
        />
      )}

      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}

function Section({ title, items, canWrite, canDelete, onRemove, onEdit, onDone, onBuy, emptyHint }) {
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
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => onEdit(g)}
                      className="flex-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded transition"
                    >
                      Edit
                    </button>
                  )}
                  {canWrite && canDelete && title === 'Plan to play' && onDone && (
                    <button
                      type="button"
                      onClick={() => onDone(g)}
                      className="flex-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded transition"
                    >
                      Done
                    </button>
                  )}
                  {canWrite && title === 'Plan to buy' && onBuy && (
                    <button
                      type="button"
                      onClick={() => onBuy(g)}
                      className="flex-1 text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-2 py-1.5 rounded transition"
                    >
                      Buy
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onRemove(g.appid)}
                      className="flex-1 text-[11px] text-muted hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-500/10 transition"
                    >
                      Remove
                    </button>
                  )}
                  {!canWrite && !canDelete && (
                    <div className="flex-1 text-[11px] text-muted italic px-2 py-1.5">
                      Read-only
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BuyConfirmModal({ game, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <img
            src={steamHeader(game.appid)}
            alt={game.name}
            className="w-20 h-10 object-cover rounded"
          />
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight truncate">{game.name}</h3>
            <p className="text-xs text-muted truncate">{game.developer}</p>
          </div>
        </div>

        <p className="text-sm text-muted">
          This will open the Steam store page for{' '}
          <span className="text-text font-medium">{game.name}</span> in a new tab and move it from
          your wishlist into your library.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Buy the game
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm font-medium text-text hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
