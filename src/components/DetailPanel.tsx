import { useEffect } from 'react';
import { X, MapPin, Zap, ExternalLink } from 'lucide-react';
import type { Genre } from '../types';
import { accentText, familyTintStyle, getFamilyColor, tintStyle } from '../data/colors';
import { useIsMobile } from '../hooks/useMediaQuery';
import { spotifyArtistUrl, spotifyTrackUrl } from '../data/urls';
import { resolveEntityReference } from '../data/entityLinks';
import { closestGenreCousins, genreDna } from '../data/rabbitHoles';
import LinkedText from './LinkedText';
import BottomSheet from './BottomSheet';

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const BEGINNER_BADGE_STYLE = tintStyle('#40b89a', 18, 34);
const DEEP_BADGE_STYLE = tintStyle('#d4ad4a', 18, 34);
const SPOTIFY_LINK_STYLE = tintStyle('#1db954', 14, 34);

interface Props {
  genre: Genre | null;
  genres: Genre[];
  onClose: () => void;
  onJumpToGenre?: (genreId: string) => void;
  onJumpToArtist?: (genreId: string, artistName: string) => void;
}

export default function DetailPanel({ genre, genres, onClose, onJumpToGenre, onJumpToArtist }: Props) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!genre) return null;
  const color = getFamilyColor(genre.family);
  const familyText = accentText(color.primary);
  const familyBadgeStyle = familyTintStyle(color, 18, 42);
  const cousins = closestGenreCousins(genre, genres);
  const dna = genreDna(genre);

  const body = (
    <div className="overflow-y-auto h-full" style={{ background: 'var(--surface-1)' }}>
      {/* header */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--surface-1) 92%, transparent)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={familyBadgeStyle}>{genre.family}</span>
              {genre.beginnerFriendly && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={BEGINNER_BADGE_STYLE}>beginner</span>
              )}
              {genre.deepCut && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                  style={DEEP_BADGE_STYLE}>deep cut</span>
              )}
            </div>
            <h2 className="text-xl font-bold truncate" style={{ color: 'var(--text-1)' }}>{genre.name}</h2>
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
                  <span className="text-[9px] font-mono" style={{ color: active ? familyText : 'var(--text-3)' }}>{d.replace('s', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          <LinkedText text={genre.description} genreId={genre.id} onJumpToGenre={onJumpToGenre} onJumpToArtist={onJumpToArtist} />
        </p>

        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Genre DNA</p>
          <div className="grid grid-cols-2 gap-2">
            {dna.map((item) => (
              <div key={item.label} className="rounded-lg border p-2.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>{item.label}</p>
                <p className="text-xs font-medium" style={{ color: familyText }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {genre.history && genre.history.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Deep history</p>
            <div className="space-y-2">
              {genre.history.map((item) => (
                <p key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <LinkedText text={item} genreId={genre.id} onJumpToGenre={onJumpToGenre} onJumpToArtist={onJumpToArtist} />
                </p>
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
                    <div key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      <LinkedText text={item} genreId={genre.id} onJumpToGenre={onJumpToGenre} onJumpToArtist={onJumpToArtist} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {genre.labels && genre.labels.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Labels & institutions</p>
                <div className="flex flex-wrap gap-1.5">
                  {genre.labels.map((item) => {
                    const ref = resolveEntityReference(item);
                    if (ref?.type === 'genre' && onJumpToGenre) {
                      return (
                        <button key={item} onClick={() => onJumpToGenre(ref.id)}
                          className="text-xs px-2 py-1 rounded hover:underline transition-colors"
                          style={familyTintStyle(color, 14, 34)}>{item}</button>
                      );
                    }
                    if (ref?.type === 'artist' && onJumpToArtist) {
                      return (
                        <button key={item} onClick={() => onJumpToArtist(genre.id, ref.label)}
                          className="text-xs px-2 py-1 rounded hover:underline transition-colors"
                          style={familyTintStyle(color, 14, 34)}>{item}</button>
                      );
                    }
                    return <span key={item} className="text-xs px-2 py-1 rounded" style={familyTintStyle(color, 14, 34)}>{item}</span>;
                  })}
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
                    const ref = resolveEntityReference(inf);
                    return ref?.type === 'genre' && onJumpToGenre ? (
                      <button key={inf} onClick={() => onJumpToGenre(ref.id)}
                        className="block text-left text-xs hover:underline" style={{ color: familyText }}>← {inf}</button>
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
                    const ref = resolveEntityReference(inf);
                    return ref?.type === 'genre' && onJumpToGenre ? (
                      <button key={inf} onClick={() => onJumpToGenre(ref.id)}
                        className="block text-left text-xs hover:underline" style={{ color: familyText }}>→ {inf}</button>
                    ) : (
                      <span key={inf} className="block text-xs" style={{ color: 'var(--text-2)' }}>→ {inf}</span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {cousins.length > 0 && onJumpToGenre && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Closest cousins</p>
            <div className="grid grid-cols-2 gap-2">
              {cousins.map((cousin) => {
                const cousinColor = getFamilyColor(cousin.family);
                return (
                  <button key={cousin.id} onClick={() => onJumpToGenre(cousin.id)}
                    className="text-left rounded-lg border p-2.5 transition-transform hover:scale-[1.01]"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    <span className="block text-xs font-semibold" style={{ color: accentText(cousinColor.primary) }}>{cousin.name}</span>
                    <span className="block text-[11px] mt-0.5 capitalize" style={{ color: 'var(--text-3)' }}>{cousin.family} · {cousin.originDecade}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* essential tracks */}
        {genre.essentialTracks && genre.essentialTracks.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Essential tracks</p>
            <div className="space-y-2">
              {genre.essentialTracks.map((t) => {
                const artistRef = resolveEntityReference(t.artist);
                return (
                  <div key={`${t.artist}-${t.title}`} className="rounded-xl p-3 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{t.title}</p>
                    {artistRef?.type === 'artist' && onJumpToArtist ? (
                      <button onClick={() => onJumpToArtist(genre.id, artistRef.label)}
                        className="text-xs hover:underline transition-colors" style={{ color: familyText }}>{t.artist}</button>
                    ) : (
                      <p className="text-xs" style={{ color: familyText }}>{t.artist}</p>
                    )}
                    <p className="text-xs leading-relaxed mt-1.5 mb-2.5" style={{ color: 'var(--text-2)' }}>{t.reason}</p>
                    <div className="flex gap-2">
                      {t.spotifyTrackId && (
                        <a href={spotifyTrackUrl(t.spotifyTrackId)} target="_blank" rel="noopener noreferrer" aria-label={`${t.title} on Spotify`}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={SPOTIFY_LINK_STYLE}>
                          <ExternalLink size={10} />Spotify
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  {onJumpToArtist ? (
                    <button onClick={() => onJumpToArtist(genre.id, a.name)}
                      className="block text-left font-semibold text-sm mb-1 hover:underline transition-colors"
                      style={{ color: familyText }}>{a.name}</button>
                  ) : (
                    <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>{a.name}</h4>
                  )}
                  <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'var(--text-2)' }}>{a.importance}</p>
                  <div className="flex gap-2">
                    {a.spotifyArtistId && (
                      <a href={spotifyArtistUrl(a.spotifyArtistId)} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Spotify`}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={SPOTIFY_LINK_STYLE}>
                        <ExternalLink size={10} />Spotify
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
                onJumpToArtist ? (
                  <button key={name} onClick={() => onJumpToArtist(genre.id, name)}
                    className="inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs hover:underline transition-colors"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                    {name}
                  </button>
                ) : (
                  <span key={name} className="inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                    {name}
                  </span>
                )
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
    <div className="fixed right-0 bottom-0 z-[70] w-[min(420px,90vw)] anim-panel shadow-2xl"
      style={{ top: '56px', borderLeft: `1px solid var(--border-strong)`, borderTop: `2px solid ${color.primary}` }}>
      {body}
    </div>
  );
}
