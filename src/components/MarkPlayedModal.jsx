import { useMemo, useState } from 'react';

function toLocalInput(ts) {
  const d = ts ? new Date(ts) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MarkPlayedModal({ game, onClose, onSave }) {
  const initialDate = useMemo(() => {
    const planned = game?.notificationDateTime ? new Date(game.notificationDateTime).getTime() : Date.now();
    return toLocalInput(planned);
  }, [game]);

  const [playedAt, setPlayedAt] = useState(initialDate);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);

  if (!game) return null;

  const handleSave = () => {
    const total = Math.max(0, Number(hours) * 60 + Number(minutes));
    onSave({
      playedAt: new Date(playedAt).getTime(),
      durationMinutes: total,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Mark as played</h3>
          <p className="text-sm text-muted mt-1">{game.name}</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">When did you play?</span>
          <input
            type="datetime-local"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium">How long did you play?</span>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="block text-[11px] text-muted mb-1">Hours</span>
              <input
                type="number"
                min={0}
                max={24}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="flex-1">
              <span className="block text-[11px] text-muted mb-1">Minutes</span>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white"
          >
            Save to history
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm font-medium text-text hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
