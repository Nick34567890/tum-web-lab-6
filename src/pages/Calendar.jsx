import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGameLists } from '../hooks/useGameLists.js';
import { steamHeader, steamStorePage } from '../data/fallbackTopGames.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BAR_DAYS = 30;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function buildHeatmap(sessions, planner) {
  const today = startOfDay(Date.now());
  const year = new Date(today).getFullYear();

  // Range: Jan 1 of current year → Dec 31 of next year
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 11, 31).getTime();

  // Pad to whole weeks (Sunday start, Saturday end). Use Date arithmetic
  // (not raw ms) so DST transitions don't drift the day boundary.
  const startDow = new Date(yearStart).getDay();
  const endDow = new Date(yearEnd).getDay();
  const startDate = new Date(year, 0, 1 - startDow);
  const endDate = new Date(year + 1, 11, 31 + (6 - endDow));
  const start = startOfDay(startDate.getTime());
  const end = startOfDay(endDate.getTime());

  // Build the per-day timestamps via Date.setDate so we always land on local midnight
  const dayTimestamps = [];
  {
    const cursor = new Date(start);
    while (cursor.getTime() <= end) {
      dayTimestamps.push(startOfDay(cursor.getTime()));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const totalDays = dayTimestamps.length;
  const totalWeeks = totalDays / 7;

  // Played minutes per day (history)
  const totals = new Map();
  for (const s of sessions) {
    const k = dayKey(s.playedAt);
    if (k < start || k > end) continue;
    totals.set(k, (totals.get(k) || 0) + s.durationMinutes);
  }

  // Planned games per day (from Plan-to-play)
  const plannedMap = new Map();
  for (const p of planner) {
    if (!p.notificationDateTime) continue;
    const k = dayKey(new Date(p.notificationDateTime).getTime());
    if (k < start || k > end) continue;
    const list = plannedMap.get(k) || [];
    list.push(p);
    plannedMap.set(k, list);
  }

  const max = Math.max(60, ...totals.values());

  const cells = [];
  for (let i = 0; i < totalDays; i += 1) {
    const ts = dayTimestamps[i];
    const minutes = totals.get(ts) || 0;
    const planned = plannedMap.get(ts) || [];
    const intensity = minutes === 0 ? 0 : Math.min(4, Math.ceil((minutes / max) * 4));
    cells.push({
      ts,
      minutes,
      planned,
      intensity,
      future: ts > today,
      isToday: ts === today,
      inYearRange: ts >= yearStart && ts <= yearEnd,
    });
  }

  // Month labels — placed at the column where a new month first appears
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < totalWeeks; w += 1) {
    const firstDayOfWeek = new Date(dayTimestamps[w * 7]);
    const m = firstDayOfWeek.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ weekIndex: w, label: MONTH_LABELS[m], year: firstDayOfWeek.getFullYear() });
      lastMonth = m;
    }
  }

  return { cells, max, totalWeeks, start, today, monthLabels };
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
  const { history, planner } = useGameLists();
  const [hoveredCell, setHoveredCell] = useState(null);
  const scrollerRef = useRef(null);
  const todayRef = useRef(null);

  const sessions = useMemo(() => buildSessions(history), [history]);
  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const heatmap = useMemo(() => buildHeatmap(sessions, planner), [sessions, planner]);
  const bars = useMemo(() => buildBars(sessions), [sessions]);
  const topGames = useMemo(() => buildTopGames(sessions), [sessions]);

  // Auto-scroll the heatmap so today's column sits roughly centered on first render.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const target = todayRef.current;
    if (!scroller || !target) return;
    scroller.scrollLeft = target.offsetLeft - scroller.clientWidth / 2 + target.offsetWidth / 2;
  }, [heatmap]);

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

  const empty = sessions.length === 0 && planner.length === 0;
  const noSessions = sessions.length === 0;

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
            <StatCard label="Days played" value={stats.daysPlayed} hint="all-time" />
            <StatCard label="Longest streak" value={`${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`} hint="consecutive days" />
            <StatCard label="Avg / session" value={formatDuration(stats.sessionCount ? Math.round(stats.totalMin / stats.sessionCount) : 0)} hint="per logged play" />
          </section>

          {/* Heatmap */}
          <section className="space-y-3">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Activity heatmap</h2>
              </div>
              <Legend />
            </div>

            <div
              ref={scrollerRef}
              className="rounded-lg border border-border bg-surface p-4 overflow-x-auto"
            >
              <div className="flex gap-1.5">
                {/* Day-of-week labels */}
                <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted sticky left-0 bg-surface z-10">
                  <div className="h-4" />
                  {DOW_LABELS.map((d, i) => (
                    <div key={d} className={`h-3.5 leading-[14px] ${i % 2 === 1 ? 'opacity-100' : 'opacity-0'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Weeks */}
                <div className="relative">
                  {/* Month labels row */}
                  <div className="flex gap-[3px] mb-1 h-4 text-[10px] text-muted relative">
                    {Array.from({ length: heatmap.totalWeeks }).map((_, w) => {
                      const ml = heatmap.monthLabels.find((m) => m.weekIndex === w);
                      return (
                        <div key={w} className="w-3.5 relative">
                          {ml && (
                            <span className="absolute left-0 whitespace-nowrap font-medium">
                              {ml.label}
                              {ml.label === 'Jan' ? ` ${ml.year}` : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Cells */}
                  <div className="flex gap-[3px]">
                    {Array.from({ length: heatmap.totalWeeks }).map((_, w) => {
                      const isTodayWeek = heatmap.cells.slice(w * 7, w * 7 + 7).some((c) => c?.isToday);
                      return (
                        <div
                          key={w}
                          ref={isTodayWeek ? todayRef : null}
                          className="flex flex-col gap-[3px]"
                        >
                          {Array.from({ length: 7 }).map((__, d) => {
                            const cell = heatmap.cells[w * 7 + d];
                            if (!cell) return <div key={d} className="w-3.5 h-3.5" />;

                            const hasPlanned = cell.planned.length > 0;
                            let bgClass;
                            if (hasPlanned) {
                              bgClass = 'bg-amber-400 hover:bg-amber-300';
                            } else if (cell.minutes > 0) {
                              bgClass = INTENSITY_BG[cell.intensity];
                            } else if (cell.future) {
                              bgClass = 'bg-surface2/40';
                            } else {
                              bgClass = INTENSITY_BG[0];
                            }

                            const ringClass = cell.isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : '';
                            const dimClass = cell.inYearRange ? '' : 'opacity-40';

                            return (
                              <div
                                key={d}
                                onMouseEnter={() => setHoveredCell(cell)}
                                onMouseLeave={() => setHoveredCell(null)}
                                title={tooltipFor(cell)}
                                className={`w-3.5 h-3.5 rounded-sm border border-border/30 ${bgClass} ${ringClass} ${dimClass}`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted mt-3 min-h-[1rem]">
                {hoveredCell ? <HoverDetails cell={hoveredCell} /> : 'Hover any square for that day’s details.'}
              </div>
            </div>
          </section>

          {!noSessions && (
          <>
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
    <div className="flex items-center gap-3 text-[11px] text-muted flex-wrap">
      <div className="flex items-center gap-1">
        <span>Less</span>
        {INTENSITY_BG.map((cls, i) => (
          <span key={i} className={`w-3 h-3 rounded-sm ${cls} border border-border/40`} />
        ))}
        <span>More</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm bg-amber-400 border border-border/40" />
        <span>Planned</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm border-2 border-accent" />
        <span>Today</span>
      </div>
    </div>
  );
}

function tooltipFor(cell) {
  const parts = [formatDate(cell.ts)];
  if (cell.minutes > 0) parts.push(`played ${formatDuration(cell.minutes)}`);
  if (cell.planned.length) parts.push(`planned: ${cell.planned.map((p) => p.name).join(', ')}`);
  if (parts.length === 1) parts.push(cell.future ? 'no plans' : 'no activity');
  return parts.join(' · ');
}

function HoverDetails({ cell }) {
  return (
    <span>
      <span className="font-medium text-text">{formatDate(cell.ts)}</span>
      {cell.minutes > 0 && <span> · played {formatDuration(cell.minutes)}</span>}
      {cell.planned.length > 0 && (
        <span> · planned: <span className="text-amber-300">{cell.planned.map((p) => p.name).join(', ')}</span></span>
      )}
      {cell.minutes === 0 && cell.planned.length === 0 && (
        <span> · {cell.future ? 'no plans' : 'no activity'}</span>
      )}
    </span>
  );
}
