import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import type { HistoryEntry } from '../hooks/useExplorationHistory';

interface Props {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function entryLabel(entry: HistoryEntry): string {
  if (entry.type === 'genre') return entry.data.name;
  if (entry.type === 'artist') return entry.data.name;
  return entry.data.title;
}

export default function RecentlyExplored({ history, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
        <History size={13} />
        <span className="hidden sm:inline">Recent</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto rounded-xl border shadow-2xl z-50 anim-fade"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Recently explored</span>
            {history.length > 0 && (
              <button onClick={onClear} className="text-[10px] hover:underline" style={{ color: 'var(--text-3)' }}>Clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="px-3 py-4 text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Nothing explored yet — click a genre, artist, or track to start.
            </p>
          ) : (
            <div className="py-1">
              {history.map((entry) => (
                <button key={`${entry.type}:${entry.data.id}`}
                  onClick={() => { onSelect(entry); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center justify-between gap-2">
                  <span className="truncate" style={{ color: 'var(--text-1)' }}>{entryLabel(entry)}</span>
                  <span className="text-[10px] uppercase flex-shrink-0" style={{ color: 'var(--text-3)' }}>{entry.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
