import { useEffect } from 'react';
import { ExternalLink, Music, Network, X } from 'lucide-react';
import type { ArtistNode, Genre } from '../types';
import { getFamilyColor } from '../data/colors';
import { useIsMobile } from '../hooks/useMediaQuery';
import BottomSheet from './BottomSheet';

interface Props {
  artist: ArtistNode | null;
  genre: Genre | null;
  onClose: () => void;
  onJumpToGenre: (genreId: string) => void;
}

export default function ArtistPanel({ artist, genre, onClose, onJumpToGenre }: Props) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!artist) return null;
  const color = getFamilyColor(artist.family);

  const body = (
    <div className="overflow-y-auto h-full" style={{ background: 'var(--surface-1)' }}>
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--surface-1) 92%, transparent)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${color.glow}55`, color: color.text }}>artist</span>
              <button onClick={() => onJumpToGenre(artist.genreId)}
                className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
                style={{ background: 'var(--surface-2)', color: color.text }}>
                {artist.genreName}
              </button>
            </div>
            <h2 className="text-xl font-bold text-white truncate">{artist.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-2)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 pb-10">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{artist.importance}</p>

        <div className="flex flex-wrap gap-2">
          {artist.spotifyUrl && (
            <a href={artist.spotifyUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(64,184,154,0.14)', color: '#5fcab0' }}>
              <ExternalLink size={13} />Spotify
            </a>
          )}
          {artist.appleMusicUrl && (
            <a href={artist.appleMusicUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(209,115,173,0.14)', color: '#e394c4' }}>
              <ExternalLink size={13} />Apple Music
            </a>
          )}
        </div>

        {artist.tracks.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Recommended tracks</p>
            <div className="space-y-2">
              {artist.tracks.map((track) => (
                <div key={track.id} className="rounded-lg border p-3"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{track.title}</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>{track.reason}</p>
                    </div>
                    <Music size={14} className="mt-0.5 flex-shrink-0" style={{ color: color.text }} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {track.appleMusicUrl && (
                      <a href={track.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                        style={{ background: 'rgba(209,115,173,0.14)', color: '#e394c4' }}>
                        <ExternalLink size={12} />Apple Music
                      </a>
                    )}
                    {track.spotifyUrl && (
                      <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                        style={{ background: 'rgba(64,184,154,0.14)', color: '#5fcab0' }}>
                        <ExternalLink size={12} />Spotify
                      </a>
                    )}
                    {!track.appleMusicUrl && !track.spotifyUrl && (
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>IDs queued</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Artist history</p>
          <div className="space-y-2">
            {artist.history.map((item) => (
              <p key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item}</p>
            ))}
          </div>
        </div>

        {genre && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Genre context</p>
              <button onClick={() => onJumpToGenre(genre.id)}
                className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-white/5"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Network size={13} style={{ color: color.text }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{genre.name}</span>
                </div>
                <p className="text-xs line-clamp-3" style={{ color: 'var(--text-2)' }}>{genre.description}</p>
              </button>
            </div>

            {genre.soundProfile && genre.soundProfile.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Sound connection</p>
                <div className="flex flex-wrap gap-1.5">
                  {genre.soundProfile.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                      <Music size={11} />{item}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
