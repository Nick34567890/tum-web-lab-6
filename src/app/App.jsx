import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from '../pages/Dashboard.jsx';
import Library from '../pages/Library.jsx';
import Calendar from '../pages/Calendar.jsx';
import Planner from '../pages/Planner.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthBar from '../components/AuthBar.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/library', label: 'Library' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/planner', label: 'Planner' },
];

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-lg font-semibold tracking-tight">
              <span className="text-accent">▶</span> GameTracker
            </div>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-muted hover:bg-surface2 hover:text-text'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <AuthBar />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/planner" element={<Planner />} />
          </Routes>
        </div>
      </main>

      <footer className="border-t border-border text-muted text-xs py-4 text-center">
        Game Activity Tracker · client-side only · data stored in your browser
      </footer>
    </div>
  );
}
