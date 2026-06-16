import { useEffect } from 'react';
import { ExternalLink, Music, X } from 'lucide-react';
import type { TrackNode } from '../types';
import { accentText, familyTintStyle, getFamilyColor, tintStyle } from '../data/colors';
import { useIsMobile } from '../hooks/useMediaQuery';

interface Props {
  track: TrackNode | null;
  onClose: () => void;
}

const SPOTIFY_LINK_STYLE = tintStyle('#1db954', 16, 34);
const APPLE_MUSIC_LINK_STYLE = tintStyle('#d173ad', 16, 34);

export default function SongPanel({ track, onClose }: Props) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!track) return null;
  const color = getFamilyColor(track.family);
  const familyText = accentText(color.primary);

  const body = (
    <div className="overflow-y-auto h-full" style={{ background: 'var(--surface-1)' }}>
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--surface-1) 92%, transparent)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={familyTintStyle(color, 18, 42)}>song</span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
                style={familyTintStyle(color, 12, 30)}>{track.genreName}</span>
            </div>
            <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-1)' }}>{track.title}</h2>
            <p className="text-sm mt-0.5" style={{ color: familyText }}>{track.artistName}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-2)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 pb-10">
        <div className="rounded-xl p-4 border flex items-start gap-3"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
          <Music size={16} className="flex-shrink-0 mt-0.5" style={{ color: familyText }} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{track.reason}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Listen</p>
          <div className="flex flex-wrap gap-2">
            {track.appleMusicUrl && (
              <a href={track.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                style={APPLE_MUSIC_LINK_STYLE}>
                <ExternalLink size={14} />Apple Music
              </a>
            )}
            {track.spotifyUrl && (
              <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                style={SPOTIFY_LINK_STYLE}>
                <ExternalLink size={14} />Spotify
              </a>
            )}
            {!track.appleMusicUrl && !track.spotifyUrl && (
              <span className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Canonical streaming IDs are queued for this roadmap track.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Artist</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{track.artistName}</p>
          </div>
          <div className="rounded-lg p-3 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Genre</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{track.genreName}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/50 anim-fade" onClick={onClose} />
        <div className="relative anim-sheet rounded-t-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '75vh', borderTop: `2px solid ${color.primary}` }}>
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
            <div className="w-9 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
          <div className="flex-1 overflow-hidden">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 bottom-0 z-[70] w-[min(380px,90vw)] anim-panel shadow-2xl"
      style={{ top: '56px', borderLeft: '1px solid var(--border-strong)', borderTop: `2px solid ${color.primary}` }}>
      {body}
    </div>
  );
}
