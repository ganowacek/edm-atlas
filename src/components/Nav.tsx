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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="text-lg font-bold tracking-wider text-white hover:text-violet-400 transition-colors"
        >
          EDM <span className="text-violet-400">ATLAS</span>
        </button>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => onNavigate(l.id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                current === l.id
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
