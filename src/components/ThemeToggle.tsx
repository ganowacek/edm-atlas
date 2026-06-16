import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../App';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isLight = theme === 'light';

  return (
    <button
      onClick={onToggle}
      className="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
        color: 'var(--text-2)',
      }}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
