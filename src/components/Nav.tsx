import type { Page } from '../App';

interface NavProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const links: { id: Page; label: string; shortLabel: string }[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home' },
  { id: 'map', label: 'Genre Map', shortLabel: 'Map' },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Timeline' },
  { id: 'about', label: 'About', shortLabel: 'About' },
];

export default function Nav({ current, onNavigate }: NavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md"
      style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
        <button onClick={() => onNavigate('home')}
          className="text-base font-bold tracking-tight transition-colors flex-shrink-0"
          style={{ color: 'var(--text-1)' }}>
          EDM <span style={{ color: 'var(--accent)' }}>Atlas</span>
        </button>
        <div className="flex items-center gap-1 overflow-x-auto justify-end min-w-0"
          style={{ scrollbarWidth: 'none' }}>
          {links.map((l) => (
            <button key={l.id} onClick={() => onNavigate(l.id)}
              className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: current === l.id ? 'var(--surface-2)' : 'transparent',
                color: current === l.id ? 'var(--text-1)' : 'var(--text-3)',
              }}>
              <span className="sm:hidden">{l.shortLabel}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
