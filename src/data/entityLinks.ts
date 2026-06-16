import genres from './genres';

export type EntityRef =
  | { type: 'genre'; id: string; label: string }
  | { type: 'artist'; label: string };

interface IndexEntry {
  name: string;
  ref: EntityRef;
}

interface EntityIndex {
  byLowerName: Map<string, EntityRef>;
  entries: IndexEntry[];
  regex: RegExp | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIndex(): EntityIndex {
  const byLowerName = new Map<string, EntityRef>();
  const entries: IndexEntry[] = [];

  const register = (name: string, ref: EntityRef) => {
    const key = name.trim().toLowerCase();
    if (!key || byLowerName.has(key)) return;
    byLowerName.set(key, ref);
    entries.push({ name, ref });
  };

  // genres are registered first so a name collision prefers the genre
  genres.forEach((g) => register(g.name, { type: 'genre', id: g.id, label: g.name }));
  genres.forEach((g) => {
    g.artists.forEach((a) => register(a.name, { type: 'artist', label: a.name }));
    (g.moreArtists ?? []).forEach((name) => register(name, { type: 'artist', label: name }));
  });

  // longest names first so multi-word names win over single-word substrings
  // (e.g. "Deep House" must be tried before "House")
  entries.sort((a, b) => b.name.length - a.name.length);
  const pattern = entries.map((e) => escapeRegExp(e.name)).join('|');
  const regex = pattern ? new RegExp(`\\b(?:${pattern})\\b`, 'g') : null;

  return { byLowerName, entries, regex };
}

let cache: EntityIndex | null = null;
function index(): EntityIndex {
  if (!cache) cache = buildIndex();
  return cache;
}

/**
 * Resolves a single name (a label, an influence entry, an artist credit) to
 * the genre or artist it refers to, if that entity exists in the dataset.
 */
export function resolveEntityReference(name: string): EntityRef | null {
  return index().byLowerName.get(name.trim().toLowerCase()) ?? null;
}

/**
 * Scans arbitrary prose for mentions of any genre or artist name that exists
 * in the dataset. Matching is case-sensitive and word-bounded so that common
 * words shared with genre names (e.g. "house") don't false-positive — every
 * entity in the dataset is written in proper case, so a real reference reads
 * the same way in prose.
 */
export function scanTextForEntities(text: string): Array<{ start: number; end: number; ref: EntityRef }> {
  const { regex, entries } = index();
  if (!regex) return [];
  const byExactName = new Map(entries.map((e) => [e.name, e.ref]));
  const results: Array<{ start: number; end: number; ref: EntityRef }> = [];
  for (const match of text.matchAll(regex)) {
    const ref = byExactName.get(match[0]);
    if (!ref) continue;
    const start = match.index ?? 0;
    results.push({ start, end: start + match[0].length, ref });
  }
  return results;
}
