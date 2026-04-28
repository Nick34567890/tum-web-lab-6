import SteamTopGames from '../components/SteamTopGames.jsx';

export default function Dashboard() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted max-w-2xl">
          Discover what people are playing right now and start tracking your own gaming activity.
        </p>
      </header>

      <SteamTopGames limit={50} />
    </div>
  );
}
