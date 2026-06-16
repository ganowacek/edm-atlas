import type { ReactNode } from 'react';
import { scanTextForEntities } from '../data/entityLinks';

interface Props {
  text: string;
  genreId: string;
  onJumpToGenre?: (genreId: string) => void;
  onJumpToArtist?: (genreId: string, artistName: string) => void;
  className?: string;
}

/**
 * Renders prose with any recognized genre/artist mention turned into a click
 * target — the same resolveEntityReference index that powers labels and
 * influences, applied to free text (scene notes, descriptions, history).
 */
export default function LinkedText({ text, genreId, onJumpToGenre, onJumpToArtist, className }: Props) {
  if (!onJumpToGenre && !onJumpToArtist) return <>{text}</>;
  const matches = scanTextForEntities(text).filter(
    (m) => (m.ref.type === 'genre' && onJumpToGenre) || (m.ref.type === 'artist' && onJumpToArtist)
  );
  if (matches.length === 0) return <>{text}</>;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start < cursor) return;
    if (m.start > cursor) nodes.push(text.slice(cursor, m.start));
    nodes.push(
      <button
        key={`${m.start}-${i}`}
        type="button"
        onClick={() => (m.ref.type === 'genre' ? onJumpToGenre!(m.ref.id) : onJumpToArtist!(genreId, m.ref.label))}
        className={className ?? 'underline decoration-dotted hover:opacity-80 transition-opacity'}
        style={{ color: 'inherit' }}
      >
        {text.slice(m.start, m.end)}
      </button>
    );
    cursor = m.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
