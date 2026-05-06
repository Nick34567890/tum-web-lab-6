import { useEffect, useState } from 'react';
import { subscribeErrors } from '../api/backend.js';

export default function GlobalToaster() {
  const [items, setItems] = useState([]);

  useEffect(
    () =>
      subscribeErrors((toast) => {
        setItems((prev) => [...prev, toast]);
        setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== toast.id));
        }, 4500);
      }),
    []
  );

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 space-y-3 z-[60] max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg p-4 shadow-lg ${
            t.type === 'error'
              ? 'bg-red-500/90 text-white'
              : 'bg-blue-500/90 text-white'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium">{t.message}</span>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="text-lg font-bold opacity-70 hover:opacity-100 leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
