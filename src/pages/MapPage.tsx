import { useRef, useState } from 'react';
import GraphExplorer, { type GraphHandle } from '../components/GraphExplorer';
import DetailPanel from '../components/DetailPanel';
import SearchBar from '../components/SearchBar';
import genres from '../data/genres';
import { FAMILY_COLORS } from '../data/colors';
import type { Genre } from '../types';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function MapPage() {
  const graphRef = useRef<GraphHandle>(null);
  const [selected, setSelected] = useState<Genre | null>(null);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const visibleGenres = familyFilter
    ? genres.filter((g) => g.family === familyFilter)
    : genres;

  const handleJump = (genreId: string) => {
    if (familyFilter) {
      const g = genres.find((x) => x.id === genreId);
      if (g && g.family !== familyFilter) setFamilyFilter(null);
    }
    // allow filter state to flush before focusing
    requestAnimationFrame(() => graphRef.current?.focusGenre(genreId));
  };

  return (
    <div className="fixed inset-0 flex flex-col pt-14" style={{ background: 'var(--bg)' }}>
      {/* top control strip */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 z-30 border-b"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}>
        <div className="flex-1 min-w-0">
          <SearchBar genres={genres} onJump={handleJump} />
        </div>

        {/* desktop family chips */}
        {!isMobile && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[55%]">
            {Object.entries(FAMILY_COLORS).map(([fam, col]) => (
              <button key={fam} onClick={() => setFamilyFilter(familyFilter === fam ? null : fam)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: familyFilter === fam ? col.primary : 'var(--surface-2)',
                  color: familyFilter === fam ? '#0a0a0e' : col.text,
                  border: `1px solid ${familyFilter === fam ? col.primary : 'var(--border)'}`,
                }}>{fam}</button>
            ))}
            {familyFilter && (
              <button onClick={() => setFamilyFilter(null)}
                className="px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>Clear</button>
            )}
          </div>
        )}

        {/* mobile filter toggle */}
        {isMobile && (
          <button onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <SlidersHorizontal size={13} />
            {familyFilter ?? 'Filter'}
            <ChevronDown size={13} className={filtersOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        )}
      </div>

      {/* mobile collapsible filter chips */}
      {isMobile && filtersOpen && (
        <div className="flex-shrink-0 px-3 py-2 flex flex-wrap gap-1.5 border-b anim-fade z-20"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
          {Object.entries(FAMILY_COLORS).map(([fam, col]) => (
            <button key={fam} onClick={() => { setFamilyFilter(familyFilter === fam ? null : fam); setFiltersOpen(false); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize"
              style={{
                background: familyFilter === fam ? col.primary : 'var(--surface-2)',
                color: familyFilter === fam ? '#0a0a0e' : col.text,
                border: `1px solid ${familyFilter === fam ? col.primary : 'var(--border)'}`,
              }}>{fam}</button>
          ))}
        </div>
      )}

      {/* graph */}
      <div className="flex-1 relative overflow-hidden">
        <GraphExplorer
          ref={graphRef}
          key={familyFilter ?? 'all'}
          genres={visibleGenres}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />

        {/* hint (desktop) */}
        {!isMobile && (
          <div className="absolute top-3 left-4 text-xs pointer-events-none" style={{ color: 'var(--text-3)' }}>
            Click a family to expand its branches · hover to trace connections
          </div>
        )}
      </div>

      <DetailPanel
        genre={selected}
        onClose={() => setSelected(null)}
        onJumpToGenre={handleJump}
        allGenres={genres}
      />
    </div>
  );
}
