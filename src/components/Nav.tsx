import type { Page } from '../App';

interface NavProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const links: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'map', label: 'Genre Map' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'about', label: 'About' },
];

export default function Nav({ current, onNavigate }: NavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md"
      style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate('home')}
          className="text-base font-bold tracking-tight transition-colors"
          style={{ color: 'var(--text-1)' }}>
          EDM <span style={{ color: 'var(--accent)' }}>Atlas</span>
        </button>
        <div className="flex items-center gap-0.5">
          {links.map((l) => (
            <button key={l.id} onClick={() => onNavigate(l.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: current === l.id ? 'var(--surface-2)' : 'transparent',
                color: current === l.id ? 'var(--text-1)' : 'var(--text-3)',
              }}>{l.label}</button>
          ))}
        </div>
      </div>
    </nav>
  );
}
