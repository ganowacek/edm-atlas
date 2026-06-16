import { ChevronRight, Home } from 'lucide-react';
import type { ArtistNode, Genre, TrackNode } from '../types';

interface Crumb {
  label: string;
  onClick?: () => void;
}

interface Props {
  genres: Genre[];
  selected: Genre | null;
  selectedArtist: ArtistNode | null;
  selectedTrack: TrackNode | null;
  onHome: () => void;
  onJumpToGenre: (genreId: string) => void;
}

export default function Breadcrumb({ genres, selected, selectedArtist, selectedTrack, onHome, onJumpToGenre }: Props) {
  const activeGenreId = selectedTrack?.genreId ?? selectedArtist?.genreId ?? selected?.id ?? null;
  const activeGenre = activeGenreId ? genres.find((g) => g.id === activeGenreId) ?? null : null;
  if (!activeGenre) return null;

  const crumbs: Crumb[] = [{ label: 'EDM', onClick: onHome }];
  if (activeGenre.parentId) {
    const parent = genres.find((g) => g.id === activeGenre.parentId);
    if (parent) crumbs.push({ label: parent.name, onClick: () => onJumpToGenre(parent.id) });
  }
  crumbs.push({ label: activeGenre.name, onClick: () => onJumpToGenre(activeGenre.id) });
  if (selectedArtist) crumbs.push({ label: selectedArtist.name });
  if (selectedTrack) crumbs.push({ label: selectedTrack.title });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-3 sm:px-4 py-1.5 text-xs overflow-x-auto flex-shrink-0 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1 whitespace-nowrap">
          {i > 0 && <ChevronRight size={11} style={{ color: 'var(--text-3)' }} />}
          {c.onClick ? (
            <button onClick={c.onClick} className="hover:underline flex items-center gap-1"
              style={{ color: i === crumbs.length - 1 ? 'var(--text-1)' : 'var(--text-2)' }}>
              {i === 0 && <Home size={11} />}{c.label}
            </button>
          ) : (
            <span style={{ color: 'var(--text-1)' }}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
