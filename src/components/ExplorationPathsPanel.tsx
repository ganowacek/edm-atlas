import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Genre } from '../types';
import { EXPLORATION_PATHS, type ExplorationPath } from '../data/explorationPaths';
import { getFamilyColor, tintStyle } from '../data/colors';
import { moodExplorationPaths } from '../data/rabbitHoles';

interface Props {
  genres: Genre[];
  onClose: () => void;
  onJumpToGenre: (genreId: string) => void;
}

function shufflePaths(paths: ExplorationPath[]) {
  const shuffled = [...paths];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ExplorationPathsPanel({ genres, onClose, onJumpToGenre }: Props) {
  const genreById = new Map(genres.map((genre) => [genre.id, genre]));
  const [randomizedPaths] = useState(() => shufflePaths([...EXPLORATION_PATHS, ...moodExplorationPaths(genres)]));

  return (
    <div className="absolute left-3 top-3 z-30 w-[min(28rem,calc(100vw-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border shadow-2xl anim-fade"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)' }}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Guided routes</p>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Exploration paths</h2>
        </div>
        <button onClick={onClose} aria-label="Close exploration paths"
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-2)' }}>
          <X size={17} />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {randomizedPaths.map((path) => {
          const pathGenres = path.genreIds.map((id) => genreById.get(id)).filter(Boolean) as Genre[];
          return (
            <div key={path.id} className="rounded-xl border p-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{path.title}</h3>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-2)' }}>{path.subtitle}</p>
                </div>
                {pathGenres[0] && (
                  <button onClick={() => onJumpToGenre(pathGenres[0].id)}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium flex-shrink-0"
                    style={tintStyle(getFamilyColor(pathGenres[0].family).primary, 16, 36)}>
                    Start
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {pathGenres.map((genre, index) => {
                  const color = getFamilyColor(genre.family);
                  return (
                    <span key={genre.id} className="inline-flex items-center gap-1.5">
                      <button onClick={() => onJumpToGenre(genre.id)}
                        className="text-[11px] px-2 py-1 rounded-lg font-medium transition-transform hover:scale-[1.02]"
                        style={tintStyle(color.primary, 15, 36)}>
                        {genre.name}
                      </button>
                      {index < pathGenres.length - 1 && <ArrowRight size={12} style={{ color: 'var(--text-3)' }} />}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
