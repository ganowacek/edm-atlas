import { X } from 'lucide-react';
import type { Genre } from '../types';
import { accentText, familyTintStyle, getFamilyColor, tintStyle } from '../data/colors';
import { closestGenreCousins } from '../data/rabbitHoles';

interface Props {
  genres: Genre[];
  selectedA: string;
  selectedB: string;
  onSelectA: (genreId: string) => void;
  onSelectB: (genreId: string) => void;
  onClose: () => void;
  onJumpToGenre: (genreId: string) => void;
}

function names(list: { name: string }[]) {
  return list.map((item) => item.name);
}

function overlap(a: string[] = [], b: string[] = []) {
  const bSet = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => bSet.has(item.toLowerCase()));
}

function GenreSummary({ genre, onJumpToGenre }: { genre: Genre; onJumpToGenre: (genreId: string) => void }) {
  const color = getFamilyColor(genre.family);
  const familyText = accentText(color.primary);

  return (
    <div className="rounded-xl border p-3 min-w-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded" style={familyTintStyle(color, 16, 38)}>
            {genre.family}
          </span>
          <h3 className="font-semibold text-sm mt-1.5 truncate" style={{ color: 'var(--text-1)' }}>{genre.name}</h3>
        </div>
        <button onClick={() => onJumpToGenre(genre.id)}
          className="text-[11px] px-2 py-1 rounded-lg flex-shrink-0" style={tintStyle(color.primary, 15, 36)}>
          Open
        </button>
      </div>
      <p className="text-xs leading-relaxed mt-2 line-clamp-3" style={{ color: 'var(--text-2)' }}>{genre.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Era</p>
          <p className="font-medium" style={{ color: familyText }}>{genre.originDecade}</p>
        </div>
        <div>
          <p className="uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Tempo</p>
          <p className="font-medium" style={{ color: familyText }}>{genre.bpmRange ?? 'Varies'}</p>
        </div>
      </div>
    </div>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>{title}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 12).map((item) => (
            <span key={item} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>No direct overlap in the current atlas data.</p>
      )}
    </div>
  );
}

export default function CompareGenresPanel({
  genres,
  selectedA,
  selectedB,
  onSelectA,
  onSelectB,
  onClose,
  onJumpToGenre,
}: Props) {
  const genreA = genres.find((genre) => genre.id === selectedA) ?? genres[0];
  const genreB = genres.find((genre) => genre.id === selectedB) ?? genres[1] ?? genres[0];
  const sharedInfluences = overlap([...genreA.influences, ...genreA.influenced], [...genreB.influences, ...genreB.influenced]);
  const sharedArtists = overlap([...names(genreA.artists), ...(genreA.moreArtists ?? [])], [...names(genreB.artists), ...(genreB.moreArtists ?? [])]);
  const sharedMoods = overlap(genreA.moods, genreB.moods);
  const sharedCities = overlap(genreA.originCities, genreB.originCities);
  const sharedSound = overlap(genreA.soundProfile ?? [], genreB.soundProfile ?? []);
  const sharedLabels = overlap(genreA.labels ?? [], genreB.labels ?? []);
  const bridgeGenres = closestGenreCousins(genreA, genres, 8)
    .filter((genre) => genre.id !== genreB.id)
    .slice(0, 3);

  return (
    <div className="absolute left-3 top-3 z-30 w-[min(42rem,calc(100vw-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border shadow-2xl anim-fade"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)' }}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Side by side</p>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Compare genres</h2>
        </div>
        <button onClick={onClose} aria-label="Close compare genres"
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-2)' }}>
          <X size={17} />
        </button>
      </div>

      <div className="p-3 space-y-4">
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={genreA.id} onChange={(event) => onSelectA(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
            {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
          </select>
          <select value={genreB.id} onChange={(event) => onSelectB(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
            {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <GenreSummary genre={genreA} onJumpToGenre={onJumpToGenre} />
          <GenreSummary genre={genreB} onJumpToGenre={onJumpToGenre} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ChipGroup title="Shared lineage" items={sharedInfluences} />
          <ChipGroup title="Shared artists" items={sharedArtists} />
          <ChipGroup title="Shared moods" items={sharedMoods} />
          <ChipGroup title="Shared cities" items={sharedCities} />
          <ChipGroup title="Shared sound profile" items={sharedSound} />
          <ChipGroup title="Shared labels" items={sharedLabels} />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Bridge route</p>
          <div className="flex flex-wrap gap-1.5">
            {[genreA, ...bridgeGenres, genreB].map((genre) => (
              <button key={genre.id} onClick={() => onJumpToGenre(genre.id)}
                className="text-[11px] px-2 py-1 rounded-lg font-medium"
                style={tintStyle(getFamilyColor(genre.family).primary, 15, 36)}>
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
