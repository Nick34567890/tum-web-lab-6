import { useEffect, useState } from 'react';
import { API_BASE_URL, refreshToken, setIdentity, subscribe } from '../api/backend.js';

const ROLES = [
  { value: 'ADMIN', label: 'ADMIN', perms: 'READ + WRITE + DELETE' },
  { value: 'WRITER', label: 'WRITER', perms: 'READ + WRITE' },
  { value: 'VISITOR', label: 'VISITOR', perms: 'READ only' },
];

function useStatus() {
  const [status, setStatus] = useState(() => ({
    online: false,
    role: 'ADMIN',
    permissions: null,
    expiresAt: 0,
    hasToken: false,
    baseUrl: API_BASE_URL,
  }));
  useEffect(() => subscribe(setStatus), []);
  return status;
}

function useTokenCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

export default function AuthBar() {
  const status = useStatus();
  const remaining = useTokenCountdown(status.expiresAt);
  const seconds = Math.ceil(remaining / 1000);

  const onChange = (e) => setIdentity({ role: e.target.value, permissions: null });

  return (
    <div className="border-b border-border bg-surface2/40">
      <div className="max-w-6xl mx-auto px-6 py-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status.online ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span className="text-muted">
            API:{' '}
            <a href={status.baseUrl} target="_blank" rel="noreferrer" className="underline">
              {status.baseUrl}
            </a>
          </span>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-muted">Role</span>
          <select
            value={status.role || 'ADMIN'}
            onChange={onChange}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="text-muted hidden sm:inline">
            ({ROLES.find((r) => r.value === status.role)?.perms ?? '—'})
          </span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-muted">JWT</span>
          {status.hasToken ? (
            <span className="font-mono text-emerald-400 tabular-nums">
              expires in {seconds}s
            </span>
          ) : (
            <span className="text-muted">no token</span>
          )}
          <button
            type="button"
            onClick={() => refreshToken().catch(() => {})}
            className="rounded-md border border-border bg-surface px-2 py-0.5 hover:bg-surface2"
          >
            refresh
          </button>
          <a
            href={`${status.baseUrl}/docs`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-surface px-2 py-0.5 hover:bg-surface2"
          >
            Swagger
          </a>
        </div>
      </div>
    </div>
  );
}
