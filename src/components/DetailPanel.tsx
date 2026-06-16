import { useEffect } from 'react';
import { X, MapPin, Zap, ExternalLink } from 'lucide-react';
import type { Genre } from '../types';
import { getFamilyColor } from '../data/colors';
import { useIsMobile } from '../hooks/useMediaQuery';

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

interface Props {
  genre: Genre | null;
  onClose: () => void;
  onJumpToGenre?: (genreId: string) => void;
  allGenres: Genre[];
}

export default function DetailPanel({ genre, onClose, onJumpToGenre, allGenres }: Props) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!genre) return null;
  const color = getFamilyColor(genre.family);

  const findByName = (name: string) =>
    allGenres.find((g) => g.name.toLowerCase() === name.toLowerCase());

  const body = (
    <div className="overflow-y-auto h-full" style={{ background: 'var(--surface-1)' }}>
      {/* header */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--surface-1) 92%, transparent)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${color.glow}55`, color: color.text }}>{genre.family}</span>
              {genre.beginnerFriendly && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(64,184,154,0.18)', color: '#9fe0cd' }}>beginner</span>
              )}
              {genre.deepCut && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(212,173,74,0.18)', color: '#ecd699' }}>deep cut</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white truncate">{genre.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-2)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 pb-10">
        {/* mini timeline */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Emerged</p>
          <div className="flex items-center gap-1">
            {DECADES.map((d) => {
              const active = d === genre.originDecade;
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="h-1 w-full rounded-full" style={{ background: active ? color.primary : 'var(--surface-3)' }} />
                  <span className="text-[9px] font-mono" style={{ color: active ? color.text : 'var(--text-3)' }}>{d.replace('s', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{genre.description}</p>

        {/* data chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <Zap size={12} style={{ color: 'var(--text-3)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-1)' }}>{genre.bpmRange ?? 'Varies'}</span>
          </div>
          {genre.originCities.map((c) => (
            <div key={c} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              <MapPin size={12} style={{ color: 'var(--text-3)' }} />
              <span className="text-xs" style={{ color: 'var(--text-1)' }}>{c}</span>
            </div>
          ))}
        </div>

        {/* moods */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Moods</p>
          <div className="flex flex-wrap gap-1.5">
            {genre.moods.map((m) => (
              <span key={m} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* influences / influenced — clickable when in dataset */}
        {(genre.influences.length > 0 || genre.influenced.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {genre.influences.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Influenced by</p>
                <div className="space-y-1">
                  {genre.influences.map((inf) => {
                    const match = findByName(inf);
                    return match && onJumpToGenre ? (
                      <button key={inf} onClick={() => onJumpToGenre(match.id)}
                        className="block text-left text-xs hover:underline" style={{ color: color.text }}>← {inf}</button>
                    ) : (
                      <span key={inf} className="block text-xs" style={{ color: 'var(--text-2)' }}>← {inf}</span>
                    );
                  })}
                </div>
              </div>
            )}
            {genre.influenced.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Influenced</p>
                <div className="space-y-1">
                  {genre.influenced.map((inf) => {
                    const match = findByName(inf);
                    return match && onJumpToGenre ? (
                      <button key={inf} onClick={() => onJumpToGenre(match.id)}
                        className="block text-left text-xs hover:underline" style={{ color: color.text }}>→ {inf}</button>
                    ) : (
                      <span key={inf} className="block text-xs" style={{ color: 'var(--text-2)' }}>→ {inf}</span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* essential tracks */}
        {genre.essentialTracks && genre.essentialTracks.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Essential tracks</p>
            <div className="space-y-1.5">
              {genre.essentialTracks.map((t) => (
                <div key={t} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--text-3)' }}>▸</span>{t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* artists */}
        {genre.artists.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Key artists</p>
            <div className="space-y-2">
              {genre.artists.map((a) => (
                <div key={a.name} className="rounded-xl p-3 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-white">{a.name}</h4>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={a.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Spotify`}
                        className="text-[11px] flex items-center gap-0.5 transition-colors" style={{ color: '#4db89a' }}>
                        <ExternalLink size={10} />Spotify</a>
                      <a href={a.appleMusicUrl} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Apple Music`}
                        className="text-[11px] flex items-center gap-0.5 transition-colors" style={{ color: '#d173ad' }}>
                        <ExternalLink size={10} />Apple</a>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{a.importance}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/50 anim-fade" onClick={onClose} />
        <div className="relative anim-sheet rounded-t-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '82vh', borderTop: `2px solid ${color.primary}` }}>
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
            <div className="w-9 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
          <div className="flex-1 overflow-hidden">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 w-[420px] anim-panel shadow-2xl"
      style={{ borderLeft: `1px solid var(--border-strong)`, borderTop: `2px solid ${color.primary}` }}>
      {body}
    </div>
  );
}
