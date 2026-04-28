import { useMemo, useState } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_WEEKS = 16; // ~ last 4 months
const BAR_DAYS = 30;

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ts) {
  return startOfDay(ts);
}

function formatDuration(min) {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function buildSessions(history) {
  return history
    .filter((g) => g.playedAt || g.completedDate)
    .map((g) => ({
      ...g,
      playedAt: g.playedAt ?? g.completedDate,
      durationMinutes: Number.isFinite(g.durationMinutes) ? g.durationMinutes : 60,
    }))
    .sort((a, b) => b.playedAt - a.playedAt);
}

function computeStats(sessions) {
  const totalMin = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const sessionCount = sessions.length;

  const daysSet = new Set(sessions.map((s) => dayKey(s.playedAt)));
  const daysPlayed = daysSet.size;

  // Longest streak (consecutive days)
  const sortedDays = [...daysSet].sort();
  let longest = 0;
  let current = 0;
  let prev = null;
  for (const d of sortedDays) {
    if (prev !== null && d - prev === DAY_MS) current += 1;
    else current = 1;
    if (current > longest) longest = current;
    prev = d;
  }

  return { totalMin, sessionCount, daysPlayed, longestStreak: longest };
}

function buildHeatmap(sessions) {
  const today = startOfDay(Date.now());
  // Anchor the grid to the most recent Sunday so columns align by week
  const todayDow = new Date(today).getDay();
  const lastCol = today + (6 - todayDow) * DAY_MS;
  const totalDays = HEATMAP_WEEKS * 7;
  const start = lastCol - (totalDays - 1) * DAY_MS;

  const totals = new Map();
  for (const s of sessions) {
    const k = dayKey(s.playedAt);
    if (k < start || k > lastCol) continue;
    totals.set(k, (totals.get(k) || 0) + s.durationMinutes);
  }

  const max = Math.max(60, ...totals.values());

  const cells = [];
  for (let i = 0; i < totalDays; i += 1) {
    const ts = start + i * DAY_MS;
    const minutes = totals.get(ts) || 0;
    const intensity = minutes === 0 ? 0 : Math.min(4, Math.ceil((minutes / max) * 4));
    cells.push({ ts, minutes, intensity, future: ts > today });
  }
  return { cells, max };
}

function buildBars(sessions) {
  const today = startOfDay(Date.now());
  const totals = new Map();
  for (const s of sessions) {
    const k = dayKey(s.playedAt);
    totals.set(k, (totals.get(k) || 0) + s.durationMinutes);
  }
  const days = [];
  for (let i = BAR_DAYS - 1; i >= 0; i -= 1) {
    const ts = today - i * DAY_MS;
    days.push({ ts, minutes: totals.get(ts) || 0 });
  }
  const peak = Math.max(60, ...days.map((d) => d.minutes));
  return { days, peak };
}

function buildTopGames(sessions, limit = 5) {
  const map = new Map();
  for (const s of sessions) {
    const cur = map.get(s.appid) || { appid: s.appid, name: s.name, developer: s.developer, minutes: 0, sessions: 0, last: 0 };
    cur.minutes += s.durationMinutes;
    cur.sessions += 1;
    cur.last = Math.max(cur.last, s.playedAt);
    map.set(s.appid, cur);
  }
  const list = [...map.values()].sort((a, b) => b.minutes - a.minutes).slice(0, limit);
  const top = list[0]?.minutes || 1;
  return list.map((g) => ({ ...g, share: g.minutes / top }));
}

const INTENSITY_BG = [
  'bg-surface2',
  'bg-emerald-900/60',
  'bg-emerald-700/70',
  'bg-emerald-500/80',
  'bg-emerald-400',
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { history } = useGameLists();
  const [hoveredCell, setHoveredCell] = useState(null);

  const sessions = useMemo(() => buildSessions(history), [history]);
  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const heatmap = useMemo(() => buildHeatmap(sessions), [sessions]);
  const bars = useMemo(() => buildBars(sessions), [sessions]);
  const topGames = useMemo(() => buildTopGames(sessions), [sessions]);

  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const k = dayKey(s.playedAt);
      const list = map.get(k) || [];
      list.push(s);
      map.set(k, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [sessions]);

  const empty = sessions.length === 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted">
          Your gaming history, visualized. Mark a planned session as Done to log hours here.
        </p>
      </header>

      {empty ? (
        <div className="p-8 rounded-lg border border-dashed border-border bg-surface space-y-2">
          <div className="font-medium">No play sessions yet</div>
          <div className="text-sm text-muted">
            Schedule a game in Planner with a date/time, then click <span className="font-mono">Done</span>{' '}
            to log how long you played. The heatmap and charts will fill in as you go.
          </div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total time" value={formatDuration(stats.totalMin)} hint={`${stats.sessionCount} session${stats.sessionCount === 1 ? '' : 's'}`} />
            <StatCard label="Days played" value={stats.daysPlayed} hint={`out of last ${HEATMAP_WEEKS * 7} days`} />
            <StatCard label="Longest streak" value={`${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`} hint="consecutive days" />
            <StatCard label="Avg / session" value={formatDuration(stats.sessionCount ? Math.round(stats.totalMin / stats.sessionCount) : 0)} hint="per logged play" />
          </section>

          {/* Heatmap */}
          <section className="space-y-3">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Activity heatmap</h2>
                <p className="text-sm text-muted">Last {HEATMAP_WEEKS} weeks — color intensity = hours played that day.</p>
              </div>
              <Legend />
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 overflow-x-auto">
              <div className="flex gap-1.5">
                <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted">
                  <div className="h-3" />
                  {DOW_LABELS.map((d, i) => (
                    <div key={d} className={`h-3 leading-3 ${i % 2 === 0 ? 'opacity-100' : 'opacity-0'}`}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="flex gap-[3px]">
                  {Array.from({ length: HEATMAP_WEEKS }).map((_, w) => (
                    <div key={w} className="flex flex-col gap-[3px]">
                      <div className="h-3" />
                      {Array.from({ length: 7 }).map((__, d) => {
                        const cell = heatmap.cells[w * 7 + d];
                        if (!cell) return <div key={d} className="w-3 h-3" />;
                        return (
                          <div
                            key={d}
                            onMouseEnter={() => setHoveredCell(cell)}
                            onMouseLeave={() => setHoveredCell(null)}
                            title={`${formatDate(cell.ts)} — ${formatDuration(cell.minutes)}`}
                            className={`w-3 h-3 rounded-sm ${cell.future ? 'bg-transparent' : INTENSITY_BG[cell.intensity]} ${cell.future ? '' : 'border border-border/40'}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted mt-3 h-4">
                {hoveredCell
                  ? `${formatDate(hoveredCell.ts)} · ${formatDuration(hoveredCell.minutes)}`
                  : 'Hover any square for that day’s total.'}
              </div>
            </div>
          </section>

          {/* Bar chart */}
          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Last {BAR_DAYS} days</h2>
              <p className="text-sm text-muted">Hours played per day. Peak: {formatDuration(bars.peak)}.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-end gap-1 h-40">
                {bars.days.map((d) => {
                  const h = d.minutes === 0 ? 2 : Math.max(4, (d.minutes / bars.peak) * 100);
                  const today = dayKey(Date.now()) === d.ts;
                  return (
                    <div
                      key={d.ts}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`${formatDate(d.ts)} — ${formatDuration(d.minutes)}`}
                    >
                      <div
                        className={`w-full rounded-t-sm ${
                          d.minutes > 0 ? 'bg-accent' : 'bg-surface2'
                        } ${today ? 'ring-2 ring-accent/60' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted">
                <span>{formatDate(bars.days[0].ts)}</span>
                <span>{formatDate(bars.days[bars.days.length - 1].ts)}</span>
              </div>
            </div>
          </section>

          {/* Top games */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Most played</h2>
            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {topGames.map((g, i) => (
                <a
                  key={g.appid}
                  href={steamStorePage(g.appid)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-surface2 transition-colors"
                >
                  <div className="w-6 text-center text-muted text-sm font-semibold">{i + 1}</div>
                  <img
                    src={steamHeader(g.appid)}
                    alt={g.name}
                    className="w-20 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{g.name}</div>
                    <div className="text-[11px] text-muted">
                      {g.sessions} session{g.sessions === 1 ? '' : 's'} · last {formatDate(g.last)}
                    </div>
                    <div className="mt-1 h-1.5 bg-surface2 rounded overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${g.share * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatDuration(g.minutes)}</div>
                </a>
              ))}
            </div>
          </section>

          {/* Detailed sessions */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Sessions</h2>
            <div className="space-y-5">
              {sessionsByDay.map(([ts, list]) => {
                const dayTotal = list.reduce((a, s) => a + s.durationMinutes, 0);
                return (
                  <div key={ts} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold tracking-tight text-accent">{formatDate(ts)}</h3>
                      <span className="text-xs text-muted">{formatDuration(dayTotal)} total</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {list.map((s, i) => (
                        <a
                          key={`${s.appid}-${i}`}
                          href={steamStorePage(s.appid)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2 hover:border-accent transition-colors"
                        >
                          <img
                            src={steamHeader(s.appid)}
                            alt={s.name}
                            className="w-24 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-[11px] text-muted">
                              {formatTime(s.playedAt)} · {formatDuration(s.durationMinutes)}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted">
      <span>Less</span>
      {INTENSITY_BG.map((cls, i) => (
        <span key={i} className={`w-3 h-3 rounded-sm ${cls} border border-border/40`} />
      ))}
      <span>More</span>
    </div>
  );
}
