import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Genre } from '../types';
import { getFamilyColor } from '../data/colors';

interface Result {
  type: 'genre' | 'artist';
  label: string;
  sublabel: string;
  genreId: string;
  family: string;
}

interface Props {
  genres: Genre[];
  onJump: (genreId: string) => void;
}

export default function SearchBar({ genres, onJump }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const index = useMemo<Result[]>(() => {
    const out: Result[] = [];
    genres.forEach((g) => {
      out.push({ type: 'genre', label: g.name, sublabel: `${g.family} · ${g.originDecade}`, genreId: g.id, family: g.family });
      g.artists.forEach((a) => {
        out.push({ type: 'artist', label: a.name, sublabel: `Artist · ${g.name}`, genreId: g.id, family: g.family });
      });
    });
    return out;
  }, [genres]);

  const results = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase();
    const scored = index
      .map((r) => {
        const l = r.label.toLowerCase();
        let score = -1;
        if (l === q) score = 100;
        else if (l.startsWith(q)) score = 80;
        else if (l.includes(q)) score = 50;
        else if (r.sublabel.toLowerCase().includes(q)) score = 20;
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (a.r.type === 'genre' ? -1 : 1))
      .slice(0, 8);
    return scored.map((x) => x.r);
  }, [query, index]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (r: Result) => {
    onJump(r.genreId);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[Math.min(active, results.length - 1)]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-md min-w-0">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search genres or artists…"
          aria-label="Search genres or artists"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm transition-colors focus:outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl overflow-hidden shadow-2xl z-50 anim-fade"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}>
          {results.map((r, i) => {
            const col = getFamilyColor(r.family);
            return (
              <button key={`${r.type}-${r.label}-${i}`} onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                style={{ background: i === active ? 'var(--surface-3)' : 'transparent' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.primary }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{r.label}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>{r.sublabel}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-mono flex-shrink-0" style={{ color: 'var(--text-3)' }}>{r.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
