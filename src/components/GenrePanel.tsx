import { useEffect } from 'react';
import { X, Music, MapPin, Calendar, Zap, Tag, ExternalLink } from 'lucide-react';
import type { Genre } from '../types';
import { getFamilyColor } from '../data/colors';

interface GenrePanelProps {
  genre: Genre;
  onClose: () => void;
}

export default function GenrePanel({ genre, onClose }: GenrePanelProps) {
  const color = getFamilyColor(genre.family);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full md:w-[480px] h-[90vh] md:h-full bg-gray-900 border-l border-white/10 overflow-y-auto shadow-2xl"
        style={{ borderTop: `2px solid ${color.primary}` }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur z-10 px-5 py-4 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${color.glow}40`, color: color.text }}
              >
                {genre.family}
              </span>
              {genre.beginnerFriendly && (
                <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Beginner friendly
                </span>
              )}
              {genre.deepCut && (
                <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Deep cut
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{genre.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <p className="text-gray-300 leading-relaxed text-sm">{genre.description}</p>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Calendar size={12} /> Decade
              </div>
              <p className="text-white font-semibold text-sm">{genre.originDecade}</p>
            </div>
            {genre.bpmRange && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                  <Zap size={12} /> BPM
                </div>
                <p className="text-white font-semibold text-sm">{genre.bpmRange}</p>
              </div>
            )}
          </div>

          {/* Cities */}
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
              <MapPin size={12} /> Key Cities / Scenes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {genre.originCities.map((city) => (
                <span
                  key={city}
                  className="text-xs px-2 py-1 rounded-full border"
                  style={{ borderColor: `${color.primary}50`, color: color.text, background: `${color.glow}15` }}
                >
                  {city}
                </span>
              ))}
            </div>
          </div>

          {/* Moods */}
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
              <Tag size={12} /> Moods
            </div>
            <div className="flex flex-wrap gap-1.5">
              {genre.moods.map((mood) => (
                <span
                  key={mood}
                  className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300"
                >
                  {mood}
                </span>
              ))}
            </div>
          </div>

          {/* Influences / Influenced */}
          {(genre.influences.length > 0 || genre.influenced.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {genre.influences.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Influenced by</p>
                  <ul className="space-y-1">
                    {genre.influences.map((inf) => (
                      <li key={inf} className="text-gray-400 text-xs">← {inf}</li>
                    ))}
                  </ul>
                </div>
              )}
              {genre.influenced.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Influenced</p>
                  <ul className="space-y-1">
                    {genre.influenced.map((inf) => (
                      <li key={inf} className="text-gray-400 text-xs">→ {inf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Essential Tracks */}
          {genre.essentialTracks && genre.essentialTracks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
                <Music size={12} /> Essential Tracks
              </div>
              <ul className="space-y-1.5">
                {genre.essentialTracks.map((track) => (
                  <li key={track} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">▸</span>
                    {track}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Artists */}
          {genre.artists.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Key Artists</p>
              <div className="space-y-3">
                {genre.artists.map((artist) => (
                  <div
                    key={artist.name}
                    className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="font-semibold text-white text-sm">{artist.name}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={artist.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5 transition-colors"
                          aria-label={`${artist.name} on Spotify`}
                        >
                          <ExternalLink size={11} /> Spotify
                        </a>
                        <a
                          href={artist.appleMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-0.5 transition-colors"
                          aria-label={`${artist.name} on Apple Music`}
                        >
                          <ExternalLink size={11} /> Apple
                        </a>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{artist.importance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
