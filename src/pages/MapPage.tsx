import { useEffect, useRef, useState } from 'react';
import GraphExplorer, { type GraphHandle } from '../components/GraphExplorer';
import DetailPanel from '../components/DetailPanel';
import ArtistPanel from '../components/ArtistPanel';
import SongPanel from '../components/SongPanel';
import SearchBar from '../components/SearchBar';
import Breadcrumb from '../components/Breadcrumb';
import RecentlyExplored from '../components/RecentlyExplored';
import genres from '../data/genres';
import { FAMILY_COLORS, accentText, familyTintStyle } from '../data/colors';
import { artistNodesForGenre, findArtistAnchor, slugify } from '../data/artistNodes';
import { useExplorationHistory, type HistoryEntry } from '../hooks/useExplorationHistory';
import type { ArtistNode, Genre, TrackNode } from '../types';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function MapPage() {
  const graphRef = useRef<GraphHandle>(null);
  const [selected, setSelected] = useState<Genre | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistNode | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackNode | null>(null);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const { history, record, clear } = useExplorationHistory();

  useEffect(() => { if (selected) record({ type: 'genre', data: selected }); }, [selected, record]);
  useEffect(() => { if (selectedArtist) record({ type: 'artist', data: selectedArtist }); }, [selectedArtist, record]);
  useEffect(() => { if (selectedTrack) record({ type: 'track', data: selectedTrack }); }, [selectedTrack, record]);

  const visibleGenres = familyFilter
    ? genres.filter((g) => g.family === familyFilter)
    : genres;

  const familyChipStyle = (fam: string, col: (typeof FAMILY_COLORS)[string]) => {
    const active = familyFilter === fam;

    return {
      ...(active ? {
        background: col.primary,
        color: 'var(--chip-selected-text)',
        border: `1px solid ${col.primary}`,
      } : familyTintStyle(col, 18, 45)),
      color: active ? 'var(--chip-selected-text)' : accentText(col.primary),
      boxShadow: active ? `0 0 0 1px color-mix(in srgb, ${col.primary} 28%, transparent)` : 'none',
    };
  };

  const handleJump = (genreId: string) => {
    if (familyFilter) {
      const g = genres.find((x) => x.id === genreId);
      if (g && g.family !== familyFilter) setFamilyFilter(null);
    }
    // allow filter state to flush before focusing
    requestAnimationFrame(() => graphRef.current?.focusGenre(genreId));
  };

  const handleJumpToArtist = (genreId: string, artistName: string) => {
    const sourceGenre = genres.find((g) => g.id === genreId);
    if (!sourceGenre) return;
    const anchor = findArtistAnchor(sourceGenre, artistName, genres);
    const node = artistNodesForGenre(anchor).find((a) => a.name.toLowerCase() === artistName.toLowerCase());
    if (!node) return;
    if (familyFilter && anchor.family !== familyFilter) setFamilyFilter(null);
    setSelected(null);
    setSelectedTrack(null);
    setSelectedArtist(node);
    requestAnimationFrame(() => graphRef.current?.focusArtist(anchor.id, node.id));
  };

  const handleHome = () => {
    setSelected(null);
    setSelectedArtist(null);
    setSelectedTrack(null);
    graphRef.current?.collapseAll();
  };

  const handleHistorySelect = (entry: HistoryEntry) => {
    if (entry.type === 'genre') {
      setSelectedArtist(null);
      setSelectedTrack(null);
      setSelected(entry.data);
      handleJump(entry.data.id);
    } else if (entry.type === 'artist') {
      setSelected(null);
      setSelectedTrack(null);
      setSelectedArtist(entry.data);
      requestAnimationFrame(() => graphRef.current?.focusArtist(entry.data.genreId, entry.data.id));
    } else {
      setSelected(null);
      setSelectedArtist(null);
      setSelectedTrack(entry.data);
      const artistId = `artist:${entry.data.genreId}:${slugify(entry.data.artistName)}`;
      requestAnimationFrame(() => graphRef.current?.focusArtist(entry.data.genreId, artistId));
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 flex flex-col" style={{ top: '56px', background: 'var(--bg)' }}>
      {/* top control strip */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 z-30 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <div className="flex-1 min-w-0 md:flex-none md:w-[min(30vw,26rem)]">
          <SearchBar genres={genres} onJump={handleJump} />
        </div>

        {/* desktop family chips */}
        {!isMobile && (
          <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 justify-end min-w-max">
            {Object.entries(FAMILY_COLORS).map(([fam, col]) => (
              <button key={fam} onClick={() => setFamilyFilter(familyFilter === fam ? null : fam)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap"
                style={familyChipStyle(fam, col)}>{fam}</button>
            ))}
            {familyFilter && (
              <button onClick={() => setFamilyFilter(null)}
                className="px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>Clear</button>
            )}
          </div>
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

        <RecentlyExplored history={history} onSelect={handleHistorySelect} onClear={clear} />
      </div>

      <Breadcrumb
        genres={genres}
        selected={selected}
        selectedArtist={selectedArtist}
        selectedTrack={selectedTrack}
        onHome={handleHome}
        onJumpToGenre={handleJump}
      />

      {/* mobile collapsible filter chips */}
      {isMobile && filtersOpen && (
        <div className="flex-shrink-0 px-3 py-2 flex flex-wrap gap-1.5 border-b anim-fade z-20"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
          {Object.entries(FAMILY_COLORS).map(([fam, col]) => (
            <button key={fam} onClick={() => { setFamilyFilter(familyFilter === fam ? null : fam); setFiltersOpen(false); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize"
              style={familyChipStyle(fam, col)}>{fam}</button>
          ))}
        </div>
      )}

      {/* graph */}
      <div className="flex-1 relative overflow-hidden">
        <GraphExplorer
          ref={graphRef}
          key={familyFilter ?? 'all'}
          genres={visibleGenres}
          selectedId={selectedTrack?.id ?? selectedArtist?.id ?? selected?.id ?? null}
          onSelect={(genre) => { setSelected(genre); setSelectedArtist(null); setSelectedTrack(null); }}
          onSelectArtist={(artist) => { setSelectedArtist(artist); setSelected(null); setSelectedTrack(null); }}
          onSelectTrack={(track) => { setSelectedTrack(track); }}
        />

        {/* hint (desktop) */}
        {!isMobile && (
          <div className="absolute top-3 left-4 text-xs pointer-events-none" style={{ color: 'var(--text-3)' }}>
            Click a genre to reveal its artist branch · use the branch control for the full graph
          </div>
        )}
      </div>

      <DetailPanel
        genre={selected}
        onClose={() => setSelected(null)}
        onJumpToGenre={handleJump}
        onJumpToArtist={handleJumpToArtist}
      />

      <ArtistPanel
        artist={selectedArtist}
        genre={selectedArtist ? genres.find((g) => g.id === selectedArtist.genreId) ?? null : null}
        onClose={() => setSelectedArtist(null)}
        onJumpToGenre={(genreId) => {
          setSelectedArtist(null);
          const genre = genres.find((g) => g.id === genreId);
          if (genre) setSelected(genre);
          handleJump(genreId);
        }}
        onJumpToArtist={handleJumpToArtist}
      />

      <SongPanel
        track={selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </div>
  );
}
