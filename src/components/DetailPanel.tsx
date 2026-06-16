import { useEffect } from 'react';
import { X, MapPin, Zap, ExternalLink } from 'lucide-react';
import type { Genre } from '../types';
import { getFamilyColor } from '../data/colors';
import { useIsMobile } from '../hooks/useMediaQuery';
import { spotifyArtistUrl, appleMusicArtistUrl } from '../data/urls';
import BottomSheet from './BottomSheet';

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

        {genre.history && genre.history.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Deep history</p>
            <div className="space-y-2">
              {genre.history.map((item) => (
                <p key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item}</p>
              ))}
            </div>
          </div>
        )}

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

        {(genre.soundProfile?.length || genre.sceneNotes?.length || genre.labels?.length) && (
          <div className="grid grid-cols-1 gap-4">
            {genre.soundProfile && genre.soundProfile.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Sound profile</p>
                <div className="flex flex-wrap gap-1.5">
                  {genre.soundProfile.map((item) => (
                    <span key={item} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {genre.sceneNotes && genre.sceneNotes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Scene context</p>
                <div className="space-y-1.5">
                  {genre.sceneNotes.map((item) => (
                    <div key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item}</div>
                  ))}
                </div>
              </div>
            )}

            {genre.labels && genre.labels.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Labels & institutions</p>
                <div className="flex flex-wrap gap-1.5">
                  {genre.labels.map((item) => (
                    <span key={item} className="text-xs px-2 py-1 rounded" style={{ background: `${color.glow}40`, color: color.text }}>{item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
                  <h4 className="font-semibold text-sm text-white mb-1">{a.name}</h4>
                  <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'var(--text-2)' }}>{a.importance}</p>
                  <div className="flex gap-2">
                    {a.spotifyArtistId && (
                      <a href={spotifyArtistUrl(a.spotifyArtistId)} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Spotify`}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(64,184,154,0.14)', color: '#5fcab0' }}>
                        <ExternalLink size={10} />Spotify
                      </a>
                    )}
                    {a.appleMusicArtistId && (
                      <a href={appleMusicArtistUrl(a.appleMusicArtistId)} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Apple Music`}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(209,115,173,0.14)', color: '#e394c4' }}>
                        <ExternalLink size={10} />Apple Music
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {genre.moreArtists && genre.moreArtists.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>More artists to explore</p>
            <div className="flex flex-wrap gap-2">
              {genre.moreArtists.map((name) => (
                <span key={name} className="inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet onClose={onClose} accentColor={color.primary} initialSnap={0.5}>
        {body}
      </BottomSheet>
    );
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 w-[min(420px,90vw)] anim-panel shadow-2xl"
      style={{ borderLeft: `1px solid var(--border-strong)`, borderTop: `2px solid ${color.primary}` }}>
      {body}
    </div>
  );
}
