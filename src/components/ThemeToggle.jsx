import { useTheme } from '../app/ThemeProvider.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="px-3 py-1.5 rounded-md text-sm font-medium border border-border bg-surface2 hover:bg-surface text-text transition-colors"
    >
      {isDark ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
