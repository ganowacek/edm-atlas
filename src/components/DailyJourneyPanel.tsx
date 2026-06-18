import { useEffect, useState } from 'react';
import { Check, ExternalLink, Route, Sparkles, X } from 'lucide-react';
import type { Genre } from '../types';
import type { HistoryEntry } from '../hooks/useExplorationHistory';
import { getFamilyColor, tintStyle } from '../data/colors';
import { pathOfDay, questTracks } from '../data/rabbitHoles';
import { spotifyTrackUrl } from '../data/urls';

interface Props {
  genres: Genre[];
  history: HistoryEntry[];
  onClose: () => void;
  onJumpToGenre: (genreId: string) => void;
}

const QUEST_STORAGE_KEY = 'edm-atlas-listening-quest';

function readChecked() {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(QUEST_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function historyGenreId(entry: HistoryEntry) {
  if (entry.type === 'genre') return entry.data.id;
  return entry.data.genreId;
}

export default function DailyJourneyPanel({ genres, history, onClose, onJumpToGenre }: Props) {
  const dailyPath = pathOfDay(genres);
  const genreById = new Map(genres.map((genre) => [genre.id, genre]));
  const dailyGenres = dailyPath.genreIds.map((id) => genreById.get(id)).filter(Boolean) as Genre[];
  const quest = questTracks(genres);
  const [checked, setChecked] = useState<string[]>(readChecked);
  const checkedSet = new Set(checked);
  const constellation = [...new Set(history.map(historyGenreId))]
    .map((id) => genreById.get(id))
    .filter(Boolean)
    .slice(0, 7) as Genre[];

  useEffect(() => {
    try {
      window.localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // Quest state remains usable for the current session.
    }
  }, [checked]);

  const toggleTrack = (id: string) => {
    setChecked((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  return (
    <div className="absolute left-3 top-3 z-30 w-[min(34rem,calc(100vw-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border shadow-2xl anim-fade"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)' }}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Daily route</p>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Journey mode</h2>
        </div>
        <button onClick={onClose} aria-label="Close journey mode"
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-2)' }}>
          <X size={17} />
        </button>
      </div>

      <div className="p-3 space-y-4">
        <div className="rounded-xl border p-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{dailyPath.title}</h3>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{dailyPath.subtitle}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {dailyGenres.map((genre) => {
              const color = getFamilyColor(genre.family);
              return (
                <button key={genre.id} onClick={() => onJumpToGenre(genre.id)}
                  className="text-[11px] px-2 py-1 rounded-lg font-medium"
                  style={tintStyle(color.primary, 15, 36)}>
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Listening quest</p>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>{checked.length}/{quest.length}</span>
          </div>
          <div className="space-y-2">
            {quest.map(({ genre, track }) => {
              const trackId = track.spotifyTrackId ?? `${genre.id}-${track.title}`;
              const done = checkedSet.has(trackId);
              const color = getFamilyColor(genre.family);
              return (
                <div key={`${genre.id}-${track.title}`} className="rounded-lg border p-2.5"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => toggleTrack(trackId)}
                      className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border flex-shrink-0"
                      aria-label={done ? `Mark ${track.title} incomplete` : `Mark ${track.title} complete`}
                      style={{ borderColor: done ? color.primary : 'var(--border-strong)', background: done ? color.primary : 'transparent' }}>
                      {done && <Check size={13} style={{ color: 'var(--chip-selected-text)' }} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{track.title}</p>
                      <button onClick={() => onJumpToGenre(genre.id)}
                        className="text-[11px] hover:underline" style={{ color: color.primary }}>{genre.name}</button>
                    </div>
                    {track.spotifyTrackId && (
                      <a href={spotifyTrackUrl(track.spotifyTrackId)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0" aria-label={`${track.title} on Spotify`}
                        style={{ color: 'var(--text-2)' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Route size={13} style={{ color: 'var(--text-3)' }} />
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Your constellation</p>
          </div>
          {constellation.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {constellation.map((genre) => (
                <button key={genre.id} onClick={() => onJumpToGenre(genre.id)}
                  className="text-[11px] px-2 py-1 rounded-lg font-medium"
                  style={tintStyle(getFamilyColor(genre.family).primary, 14, 34)}>
                  {genre.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Explore a few genres and this becomes your temporary custom route.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
