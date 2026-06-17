import { useEffect, useMemo, useRef, useState } from 'react';
import GraphExplorer, { type GraphDepthMode, type GraphHandle } from '../components/GraphExplorer';
import DetailPanel from '../components/DetailPanel';
import ArtistPanel from '../components/ArtistPanel';
import SongPanel from '../components/SongPanel';
import SearchBar from '../components/SearchBar';
import Breadcrumb from '../components/Breadcrumb';
import RecentlyExplored from '../components/RecentlyExplored';
import ExplorationPathsPanel from '../components/ExplorationPathsPanel';
import CompareGenresPanel from '../components/CompareGenresPanel';
import DailyJourneyPanel from '../components/DailyJourneyPanel';
import MapMiniLegend from '../components/MapMiniLegend';
import genres from '../data/genres';
import { FAMILY_COLORS, accentText, familyTintStyle } from '../data/colors';
import { artistNodesForGenre, findArtistAnchor, slugify } from '../data/artistNodes';
import { closestGenreCousins } from '../data/rabbitHoles';
import { useExplorationHistory, type HistoryEntry } from '../hooks/useExplorationHistory';
import type { ArtistNode, Genre, TrackNode } from '../types';
import { CalendarDays, ChevronDown, GitCompare, Map, Route, Shuffle, SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const GRAPH_HUB_ID = '__edm__';

export default function MapPage() {
  const graphRef = useRef<GraphHandle>(null);
  const [selected, setSelected] = useState<Genre | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistNode | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackNode | null>(null);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'paths' | 'compare' | 'journey' | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [compareA, setCompareA] = useState('uk-garage');
  const [compareB, setCompareB] = useState('dubstep');
  const [surpriseMode, setSurpriseMode] = useState<'any' | 'beginner' | 'deep' | 'family'>('any');
  const [graphDepthMode, setGraphDepthMode] = useState<GraphDepthMode>('subgenres');
  const [surprisePathIds, setSurprisePathIds] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { history, record, clear } = useExplorationHistory();

  useEffect(() => { if (selected) record({ type: 'genre', data: selected }); }, [selected, record]);
  useEffect(() => { if (selectedArtist) record({ type: 'artist', data: selectedArtist }); }, [selectedArtist, record]);
  useEffect(() => { if (selectedTrack) record({ type: 'track', data: selectedTrack }); }, [selectedTrack, record]);

  const visibleGenres = (() => {
    const familyScoped = familyFilter
      ? genres.filter((g) => g.family === familyFilter)
      : genres;
    if (!eraFilter) return familyScoped;
    const scopedIds = new Set(familyScoped.map((genre) => genre.id));
    const parentIds = new Set<string>();
    const matches = familyScoped.filter((genre) => genre.originDecade === eraFilter);
    matches.forEach((genre) => {
      if (genre.parentId && scopedIds.has(genre.parentId)) parentIds.add(genre.parentId);
    });
    return familyScoped.filter((genre) => genre.originDecade === eraFilter || parentIds.has(genre.id));
  })();
  const graphGenres = activeTool === 'compare' ? genres : visibleGenres;
  const compareGraphIds = useMemo(() => {
    if (activeTool !== 'compare') return undefined;
    const genreA = genres.find((genre) => genre.id === compareA);
    const genreB = genres.find((genre) => genre.id === compareB);
    if (!genreA || !genreB) return undefined;
    const bridge = closestGenreCousins(genreA, genres, 8)
      .filter((genre) => genre.id !== genreB.id)
      .slice(0, 3)
      .map((genre) => genre.id);
    return [...new Set([genreA.id, ...bridge, genreB.id])];
  }, [activeTool, compareA, compareB]);

  const hasChildGenres = (genreId: string) => genres.some((genre) => genre.parentId === genreId);

  const genrePathIds = (genre: Genre) => {
    const parent = genre.parentId ? genres.find((candidate) => candidate.id === genre.parentId) : null;
    return [GRAPH_HUB_ID, parent?.id, genre.id].filter(Boolean) as string[];
  };

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
    const target = genres.find((x) => x.id === genreId);
    if (familyFilter) {
      if (target && target.family !== familyFilter) setFamilyFilter(null);
    }
    if (eraFilter && target?.originDecade !== eraFilter) setEraFilter(null);
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
    if (eraFilter && anchor.originDecade !== eraFilter) setEraFilter(null);
    setSelected(null);
    setSelectedTrack(null);
    setSelectedArtist(node);
    requestAnimationFrame(() => graphRef.current?.focusArtist(anchor.id, node.id));
  };

  const jumpToGenre = (genre: Genre) => {
    setSelected(genre);
    setSelectedArtist(null);
    setSelectedTrack(null);
    handleJump(genre.id);
  };

  const startSomewhere = () => {
    const candidates = visibleGenres.filter((genre) => genre.parentId || !hasChildGenres(genre.id));
    const basePool = candidates.length > 0 ? candidates : visibleGenres;
    const scopedPool = basePool.filter((genre) => {
      if (surpriseMode === 'beginner') return genre.beginnerFriendly;
      if (surpriseMode === 'deep') return genre.deepCut;
      if (surpriseMode === 'family') return familyFilter ? genre.family === familyFilter : true;
      return true;
    });
    const pool = scopedPool.length > 0 ? scopedPool : basePool;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      setActiveTool(null);
      setGraphDepthMode(pick.parentId ? 'families' : 'subgenres');
      setSurprisePathIds(genrePathIds(pick));
      jumpToGenre(pick);
    }
  };

  const handleHome = () => {
    setSelected(null);
    setSelectedArtist(null);
    setSelectedTrack(null);
    setSurprisePathIds([]);
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
          <SearchBar genres={genres} onJump={handleJump} onJumpToArtist={handleJumpToArtist} />
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

      <div className="flex-shrink-0 px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <button onClick={() => setActiveTool((value) => value === 'paths' ? null : 'paths')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border"
          style={{
            background: activeTool === 'paths' ? 'var(--accent)' : 'var(--surface-2)',
            borderColor: activeTool === 'paths' ? 'var(--accent)' : 'var(--border)',
            color: activeTool === 'paths' ? 'var(--accent-contrast)' : 'var(--text-2)',
          }}>
          <Map size={14} /> Paths
        </button>
        <button onClick={() => setActiveTool((value) => value === 'compare' ? null : 'compare')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border"
          style={{
            background: activeTool === 'compare' ? 'var(--accent)' : 'var(--surface-2)',
            borderColor: activeTool === 'compare' ? 'var(--accent)' : 'var(--border)',
            color: activeTool === 'compare' ? 'var(--accent-contrast)' : 'var(--text-2)',
          }}>
          <GitCompare size={14} /> Compare
        </button>
        <button onClick={() => setActiveTool((value) => value === 'journey' ? null : 'journey')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border"
          style={{
            background: activeTool === 'journey' ? 'var(--accent)' : 'var(--surface-2)',
            borderColor: activeTool === 'journey' ? 'var(--accent)' : 'var(--border)',
            color: activeTool === 'journey' ? 'var(--accent-contrast)' : 'var(--text-2)',
          }}>
          <Route size={14} /> Journey
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
          <CalendarDays size={14} />
          <select value={eraFilter ?? 'all'} onChange={(event) => setEraFilter(event.target.value === 'all' ? null : event.target.value)}
            aria-label="Filter map by era"
            className="bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-2)' }}>
            <option value="all">All eras</option>
            {DECADES.map((decade) => <option key={decade} value={decade}>{decade}</option>)}
          </select>
        </div>
        <button onClick={startSomewhere}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
          <Shuffle size={14} /> Start somewhere
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
          <select value={surpriseMode} onChange={(event) => setSurpriseMode(event.target.value as typeof surpriseMode)}
            aria-label="Choose start somewhere mode"
            className="bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-2)' }}>
            <option value="any">Surprise: any</option>
            <option value="beginner">Surprise: beginner</option>
            <option value="deep">Surprise: deep cut</option>
            <option value="family">Surprise: this family</option>
          </select>
        </div>
        {(familyFilter || eraFilter) && (
          <button onClick={() => { setFamilyFilter(null); setEraFilter(null); }}
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap border"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            Clear filters
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
              style={familyChipStyle(fam, col)}>{fam}</button>
          ))}
        </div>
      )}

      {/* graph */}
      <div className="flex-1 relative overflow-hidden">
        <GraphExplorer
          ref={graphRef}
          key={`${familyFilter ?? 'all'}-${eraFilter ?? 'all'}`}
          genres={graphGenres}
          selectedId={selectedTrack?.id ?? selectedArtist?.id ?? selected?.id ?? null}
          highlightedPathIds={surprisePathIds}
          depthMode={graphDepthMode}
          onDepthModeChange={setGraphDepthMode}
          compareGenreIds={compareGraphIds}
          onSelect={(genre) => { setSurprisePathIds([]); setSelected(genre); setSelectedArtist(null); setSelectedTrack(null); }}
          onSelectArtist={(artist) => { setSurprisePathIds([]); setSelectedArtist(artist); setSelected(null); setSelectedTrack(null); }}
          onSelectTrack={(track) => { setSurprisePathIds([]); setSelectedTrack(track); }}
        />

        {/* hint (desktop) */}
        {!isMobile && (
          <div className="absolute top-3 left-4 text-xs pointer-events-none" style={{ color: 'var(--text-3)' }}>
            Click a genre to reveal its artist branch · use the branch control for the full graph
          </div>
        )}

        {activeTool === 'paths' && (
          <ExplorationPathsPanel
            genres={genres}
            onClose={() => setActiveTool(null)}
            onJumpToGenre={(genreId) => {
              setActiveTool(null);
              const genre = genres.find((item) => item.id === genreId);
              if (genre) jumpToGenre(genre);
            }}
          />
        )}

        {activeTool === 'compare' && (
          <CompareGenresPanel
            genres={genres}
            selectedA={compareA}
            selectedB={compareB}
            onSelectA={setCompareA}
            onSelectB={setCompareB}
            onClose={() => setActiveTool(null)}
            onJumpToGenre={(genreId) => {
              const genre = genres.find((item) => item.id === genreId);
              if (genre) jumpToGenre(genre);
            }}
          />
        )}

        {activeTool === 'journey' && (
          <DailyJourneyPanel
            genres={genres}
            history={history}
            onClose={() => setActiveTool(null)}
            onJumpToGenre={(genreId) => {
              setActiveTool(null);
              const genre = genres.find((item) => item.id === genreId);
              if (genre) jumpToGenre(genre);
            }}
          />
        )}

        <MapMiniLegend open={legendOpen} onToggle={() => setLegendOpen((value) => !value)} />
      </div>

      <DetailPanel
        genre={selected}
        genres={genres}
        onClose={() => setSelected(null)}
        onJumpToGenre={(genreId) => {
          const genre = genres.find((item) => item.id === genreId);
          if (genre) jumpToGenre(genre);
        }}
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
