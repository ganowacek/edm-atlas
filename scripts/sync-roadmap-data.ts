import { readFile, writeFile } from 'node:fs/promises';
import { genres } from '../src/data/genres';
import { ARTIST_TRACKS as EXISTING_ARTIST_TRACKS } from '../src/data/artistTracks';

interface RoadmapArtist {
  genreName: string;
  artistName: string;
  tracks: string[];
}

interface AppleArtistResult {
  artistId: number;
  artistName: string;
}

interface AppleTrackResult {
  artistName: string;
  trackName: string;
  collectionId: number;
  trackId: number;
}

interface ResolvedTrack {
  title: string;
  appleMusicAlbumId?: string;
  appleMusicSongId?: string;
  spotifyTrackId?: string;
  reason: string;
}

const RESOLVE_APPLE = process.argv.includes('--resolve-apple');
const SONG_ROADMAP = process.argv.find((arg) => arg.endsWith('.txt'))
  ?? new URL('./data/roadmap-songs.txt', import.meta.url);
const GENRES_FILE = new URL('../src/data/genres.ts', import.meta.url);
const ARTIST_TRACKS_FILE = new URL('../src/data/artistTracks.ts', import.meta.url);

const artistCache = new Map<string, AppleArtistResult | null>();
const trackCache = new Map<string, AppleTrackResult | null>();
let lastLookupAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/\b(the|dj)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeArtist(value: string) {
  return normalize(
    value
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+\/\s+/g, ' ')
      .replace(/\s+-\s+/g, ' ')
  );
}

function decodeTsString(value: string) {
  return value.replace(/\\'/g, "'");
}

function escapeTsString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function canonicalArtistQueries(name: string) {
  const variants = [
    name,
    name.replace(/\([^)]*\)/g, '').trim(),
    name.split('/')[0]?.trim(),
    name.split('&')[0]?.trim(),
    name.replace(/\bFISHER\b/i, 'Fisher'),
    name.replace(/\bTHEMBA\b/i, 'Themba'),
  ].filter(Boolean) as string[];

  return [...new Set(variants)];
}

function scoreArtistResult(query: string, result: AppleArtistResult) {
  const q = normalizeArtist(query);
  const r = normalizeArtist(result.artistName);
  if (r === q) return 100;
  if (r.includes(q) || q.includes(r)) return 82;
  const qParts = new Set(q.split(' '));
  const overlap = r.split(' ').filter((part) => qParts.has(part)).length;
  return overlap * 16 - Math.abs(r.length - q.length) * 0.08;
}

function scoreTrackResult(artistName: string, title: string, result: AppleTrackResult) {
  const requestedTitle = normalize(title);
  const returnedTitle = normalize(result.trackName);
  const requestedArtist = normalizeArtist(artistName);
  const returnedArtist = normalizeArtist(result.artistName);

  let score = 0;
  if (returnedTitle === requestedTitle) score += 120;
  else if (returnedTitle.includes(requestedTitle) || requestedTitle.includes(returnedTitle)) score += 78;
  else {
    const titleParts = new Set(requestedTitle.split(' '));
    score += returnedTitle.split(' ').filter((part) => titleParts.has(part)).length * 18;
  }

  if (returnedArtist === requestedArtist) score += 70;
  else if (returnedArtist.includes(requestedArtist) || requestedArtist.includes(returnedArtist)) score += 42;
  else {
    const artistParts = new Set(requestedArtist.split(' '));
    score += returnedArtist.split(' ').filter((part) => artistParts.has(part)).length * 10;
  }

  return score - Math.abs(returnedTitle.length - requestedTitle.length) * 0.12;
}

async function searchItunes<T>(params: Record<string, string>, key: string): Promise<T[]> {
  const url = new URL('https://itunes.apple.com/search');
  Object.entries({ country: 'US', limit: '12', media: 'music', ...params }).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });

  const elapsed = Date.now() - lastLookupAt;
  if (elapsed < 180) await sleep(180 - elapsed);
  lastLookupAt = Date.now();

  let response: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(url, {
      headers: { 'User-Agent': 'EDM-Atlas-DataSync/1.0' },
    });

    if (response.status !== 429) break;
    await sleep(1000 * (attempt + 1));
  }

  if (!response?.ok) {
    console.warn(`Skipping iTunes lookup for ${key}: ${response?.status ?? 'no response'}`);
    return [];
  }

  const data = await response.json() as { results?: T[] };
  return data.results ?? [];
}

async function resolveAppleArtist(name: string) {
  const cacheKey = normalizeArtist(name);
  if (artistCache.has(cacheKey)) return artistCache.get(cacheKey) ?? null;

  let best: AppleArtistResult | null = null;
  let bestScore = -Infinity;
  for (const query of canonicalArtistQueries(name)) {
    const results = await searchItunes<AppleArtistResult>({
      entity: 'musicArtist',
      term: query,
    }, `artist:${query}`);
    for (const result of results) {
      const score = scoreArtistResult(query, result);
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }
  }

  const resolved = best && bestScore >= 28 ? best : null;
  artistCache.set(cacheKey, resolved);
  return resolved;
}

async function resolveAppleTrack(artistName: string, title: string) {
  const cacheKey = `${normalizeArtist(artistName)}::${normalize(title)}`;
  if (trackCache.has(cacheKey)) return trackCache.get(cacheKey) ?? null;

  const queries = [
    `${artistName} ${title}`,
    `${canonicalArtistQueries(artistName)[0]} ${title}`,
    title,
  ];

  let best: AppleTrackResult | null = null;
  let bestScore = -Infinity;
  for (const query of [...new Set(queries)]) {
    const results = await searchItunes<AppleTrackResult>({
      entity: 'song',
      term: query,
    }, `track:${query}`);

    for (const result of results.filter((r) => r.collectionId && r.trackId)) {
      const score = scoreTrackResult(artistName, title, result);
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }
  }

  const resolved = best && bestScore >= 82 ? best : null;
  trackCache.set(cacheKey, resolved);
  return resolved;
}

function parseRoadmap(text: string): RoadmapArtist[] {
  const rows: RoadmapArtist[] = [];
  let currentGenre = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[A-Z0-9 &/-]+$/.test(line) && !line.includes(':')) continue;

    if (!line.includes(':')) {
      currentGenre = line;
      continue;
    }

    const [artistName, rest] = line.split(/:(.*)/s);
    const tracks = rest
      .split(';')
      .map((track) => track.trim())
      .filter(Boolean);
    rows.push({ genreName: currentGenre, artistName: artistName.trim(), tracks });
  }

  return rows;
}

function buildGraphArtistAliases() {
  const aliases = new Map<string, Set<string>>();

  for (const genre of genres) {
    for (const artist of genre.artists) {
      const parenthetical = artist.name.match(/^(.*?)\s*\((.*?)\)$/);
      const keys = [
        artist.name,
        artist.name.replace(/\([^)]*\)/g, '').trim(),
        artist.name.split('/')[0]?.trim(),
        artist.name.split('&')[0]?.trim(),
        parenthetical ? `${parenthetical[2]} ${parenthetical[1]}` : '',
        parenthetical ? `${parenthetical[1]} ${parenthetical[2]}` : '',
      ].filter(Boolean) as string[];

      for (const key of keys) {
        const normalized = normalizeArtist(key);
        if (!aliases.has(normalized)) aliases.set(normalized, new Set());
        aliases.get(normalized)?.add(artist.name);
      }
    }
  }

  return aliases;
}

function reasonFor(artistName: string, genreName: string, title: string) {
  return `${title} is a curated ${genreName} reference point for ${artistName}, chosen from the EDM Atlas roadmap for how it represents this branch of electronic music history.`;
}

function existingTrackFor(artistName: string, title: string) {
  const candidates = [
    artistName,
    artistName.replace(/\([^)]*\)/g, '').trim(),
    artistName.split('/')[0]?.trim(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const tracks = EXISTING_ARTIST_TRACKS[candidate];
    const match = tracks?.find((track) => normalize(track.title) === normalize(title));
    if (match) return match;
  }

  return null;
}

async function buildTrackData(rows: RoadmapArtist[]) {
  const aliases = buildGraphArtistAliases();
  const tracksByArtist = new Map<string, ResolvedTrack[]>();
  const unresolvedTracks: string[] = [];

  for (const row of rows) {
    const normalized = normalizeArtist(row.artistName);
    const graphNames = new Set<string>([row.artistName]);
    aliases.get(normalized)?.forEach((name) => graphNames.add(name));
    aliases.get(normalizeArtist(row.artistName.split('/')[0] ?? row.artistName))?.forEach((name) => graphNames.add(name));

    const resolvedTracks: ResolvedTrack[] = [];
    for (const title of row.tracks.slice(0, 3)) {
      const existing = existingTrackFor(row.artistName, title);
      if (existing?.appleMusicAlbumId && existing.appleMusicSongId) {
        resolvedTracks.push({
          title,
          appleMusicAlbumId: existing.appleMusicAlbumId,
          appleMusicSongId: existing.appleMusicSongId,
          spotifyTrackId: existing.spotifyTrackId,
          reason: reasonFor(row.artistName, row.genreName, title),
        });
        continue;
      }

      const resolved = RESOLVE_APPLE ? await resolveAppleTrack(row.artistName, title) : null;
      if (!resolved && RESOLVE_APPLE) {
        unresolvedTracks.push(`${row.artistName} - ${title}`);
      }

      resolvedTracks.push({
        title,
        appleMusicAlbumId: resolved ? String(resolved.collectionId) : undefined,
        appleMusicSongId: resolved ? String(resolved.trackId) : undefined,
        spotifyTrackId: existing?.spotifyTrackId,
        reason: reasonFor(row.artistName, row.genreName, title),
      });
    }

    if (resolvedTracks.length === 0) continue;
    for (const name of graphNames) {
      const existing = tracksByArtist.get(name) ?? [];
      const seen = new Set(existing.map((track) => normalize(track.title)));
      for (const track of resolvedTracks) {
        if (seen.has(normalize(track.title))) continue;
        existing.push(track);
        seen.add(normalize(track.title));
      }
      tracksByArtist.set(name, existing);
    }
  }

  return { tracksByArtist, unresolvedTracks };
}

async function buildAppleArtistIds() {
  const ids = new Map<string, string>();
  const unresolved: string[] = [];

  const uniqueArtists = [...new Set(genres.flatMap((genre) => genre.artists.map((artist) => artist.name)))];
  for (const artistName of uniqueArtists) {
    const resolved = await resolveAppleArtist(artistName);
    if (!resolved) {
      unresolved.push(artistName);
      continue;
    }
    ids.set(artistName, String(resolved.artistId));
  }

  return { ids, unresolved };
}

function renderArtistTracks(tracksByArtist: Map<string, ResolvedTrack[]>) {
  const sorted = [...tracksByArtist.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = [
    "import type { ArtistTrackSuggestion } from '../types';",
    '',
    'export const ARTIST_TRACKS: Record<string, ArtistTrackSuggestion[]> = {',
  ];

  for (const [artistName, tracks] of sorted) {
    lines.push(`  '${escapeTsString(artistName)}': [`);
    for (const track of tracks.slice(0, 3)) {
      lines.push('    {');
      lines.push(`      title: '${escapeTsString(track.title)}',`);
      if (track.appleMusicAlbumId) lines.push(`      appleMusicAlbumId: '${track.appleMusicAlbumId}',`);
      if (track.appleMusicSongId) lines.push(`      appleMusicSongId: '${track.appleMusicSongId}',`);
      if (track.spotifyTrackId) lines.push(`      spotifyTrackId: '${track.spotifyTrackId}',`);
      lines.push(`      reason: '${escapeTsString(track.reason)}',`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

function patchGenresSource(source: string, artistIds: Map<string, string>) {
  return source.replace(
    /\{ name: '((?:\\'|[^'])+)', importance: '((?:\\'|[^'])*)'([^}]*)\}/g,
    (match, rawName: string, importance: string, rest: string) => {
      const name = decodeTsString(rawName);
      const appleMusicArtistId = artistIds.get(name);
      if (!appleMusicArtistId || rest.includes('appleMusicArtistId')) return match;
      return `{ name: '${rawName}', importance: '${importance}'${rest}, appleMusicArtistId: '${appleMusicArtistId}' }`;
    }
  );
}

async function main() {
  const roadmap = parseRoadmap(await readFile(SONG_ROADMAP, 'utf8'));
  const { tracksByArtist, unresolvedTracks } = await buildTrackData(roadmap);
  const { ids, unresolved: unresolvedArtists } = RESOLVE_APPLE
    ? await buildAppleArtistIds()
    : { ids: new Map<string, string>(), unresolved: [] };

  await writeFile(ARTIST_TRACKS_FILE, renderArtistTracks(tracksByArtist));

  if (RESOLVE_APPLE) {
    const genresSource = await readFile(GENRES_FILE, 'utf8');
    await writeFile(GENRES_FILE, patchGenresSource(genresSource, ids));
  }

  console.log(`Roadmap artist rows: ${roadmap.length}`);
  console.log(`Artist track entries: ${tracksByArtist.size}`);
  console.log(`Resolved track rows: ${[...tracksByArtist.values()].flat().length}`);
  console.log(`Apple artist IDs resolved: ${ids.size}`);
  console.log(`Unresolved artists: ${unresolvedArtists.length}`);
  console.log(`Unresolved tracks: ${unresolvedTracks.length}`);
  if (unresolvedArtists.length) console.log(unresolvedArtists.slice(0, 40).join('\n'));
  if (unresolvedTracks.length) console.log(unresolvedTracks.slice(0, 80).join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
