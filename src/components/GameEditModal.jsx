import { useState } from 'react';

export function GameEditModal({ game, onSave, onClose, isInLibrary = true, listType = 'planner' }) {
  const [notificationDateTime, setNotificationDateTime] = useState(game.notificationDateTime || '');
  const [wantToBuy, setWantToBuy] = useState(game.wantToBuy || false);

  const handleSave = () => {
    // Prevent saving "Plan to play" for games not in library
    if (listType === 'planner' && !isInLibrary) {
      return;
    }
    
    onSave({
      notificationDateTime: notificationDateTime || null,
      wantToBuy,
    });
    onClose();
  };

  // Format datetime for display
  const formatDisplayDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Not set';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{game.name}</h2>
          <p className="text-sm text-muted mt-1">{game.developer}</p>
          <div className="mt-2 text-xs font-medium space-y-1">
            {game.wantToBuy ? (
              <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded inline-block">
                🛒 Plan to buy
              </div>
            ) : (
              <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded inline-block">
                🎮 Plan to play
              </div>
            )}
            {listType === 'planner' && !isInLibrary && (
              <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded block mt-2">
                ⚠️ Game must be in your library first
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Notification DateTime */}
          <div className="space-y-2">
            <label htmlFor="notificationDateTime" className="block text-sm font-medium">
              🔔 Notification Date & Time (Optional)
            </label>
            <p className="text-xs text-muted mb-2">
              {wantToBuy 
                ? 'You will be notified: "Time to buy [game name]"'
                : 'You will be notified: "Time to play [game name]"'
              }
            </p>
            <input
              id="notificationDateTime"
              type="datetime-local"
              value={notificationDateTime}
              onChange={(e) => setNotificationDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-muted space-y-1">
              <p>📅 Scheduled: {formatDisplayDateTime(notificationDateTime)}</p>
              <p className="opacity-70">Current time: {new Date().toLocaleString()}</p>
              {notificationDateTime && (
                <p className="text-blue-400">
                  ⏱️ Stored value: {notificationDateTime}
                </p>
              )}
            </div>
          </div>

          {/* Want to Buy Checkbox */}
          <div className="flex items-center space-x-3">
            <input
              id="wantToBuy"
              type="checkbox"
              checked={wantToBuy}
              onChange={(e) => setWantToBuy(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface2 cursor-pointer"
            />
            <label htmlFor="wantToBuy" className="text-sm font-medium cursor-pointer">
              🛒 I want to buy this game
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={listType === 'planner' && !isInLibrary}
            className={`flex-1 font-medium py-2 rounded-lg transition ${
              listType === 'planner' && !isInLibrary
                ? 'bg-gray-500 cursor-not-allowed opacity-50 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {listType === 'planner' && !isInLibrary ? 'Cannot Save - Add to Library First' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-surface2 hover:bg-surface3 border border-border text-text font-medium py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
