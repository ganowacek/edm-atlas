import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { genres } from '../src/data/genres';
import { ARTIST_TRACKS } from '../src/data/artistTracks';
import type { ArtistTrackSuggestion } from '../src/types';

interface AppleArtistResult {
  artistId: number;
  artistName: string;
}

interface AppleTrackResult {
  artistId: number;
  artistName: string;
  collectionId: number;
  trackId: number;
  trackName: string;
}

interface SpotifyCacheEntry {
  spotifyArtistId?: string;
  spotifyTrackId?: string;
}

interface AppleCache {
  artists: Record<string, AppleArtistResult | null>;
  tracks: Record<string, AppleTrackResult | null>;
}

const GENRES_FILE = new URL('../src/data/genres.ts', import.meta.url);
const ARTIST_TRACKS_FILE = new URL('../src/data/artistTracks.ts', import.meta.url);
const APPLE_CACHE_FILE = new URL('./data/apple-resolution-cache.json', import.meta.url);
const SPOTIFY_CACHE_FILE = new URL('./data/spotify-resolution-cache.json', import.meta.url);

const maxLookupsArg = process.argv.find((arg) => arg.startsWith('--max-lookups='));
const MAX_LOOKUPS = maxLookupsArg ? Number(maxLookupsArg.split('=')[1]) : Infinity;
const APPLY_ONLY = process.argv.includes('--apply-only');

let lookupCount = 0;
let blocked = false;
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

function trackKey(artistName: string, title: string) {
  return `${normalizeArtist(artistName)}::${normalize(title)}`;
}

function artistKey(artistName: string) {
  return normalizeArtist(artistName);
}

function decodeTsString(value: string) {
  return value.replace(/\\'/g, "'");
}

function escapeTsString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function canonicalArtistQueries(name: string) {
  return [...new Set([
    name,
    name.replace(/\([^)]*\)/g, '').trim(),
    name.split('/')[0]?.trim(),
    name.split('&')[0]?.trim(),
    name.replace(/\bFISHER\b/i, 'Fisher'),
    name.replace(/\bTHEMBA\b/i, 'Themba'),
  ].filter(Boolean) as string[])];
}

function scoreArtistResult(query: string, result: AppleArtistResult) {
  const q = normalizeArtist(query);
  const r = normalizeArtist(result.artistName);
  if (q === r) return 100;
  if (q.includes(r) || r.includes(q)) return 82;
  const qParts = new Set(q.split(' '));
  return r.split(' ').filter((part) => qParts.has(part)).length * 16 - Math.abs(r.length - q.length) * 0.08;
}

function scoreTrackResult(artistName: string, title: string, result: AppleTrackResult) {
  const requestedTitle = normalize(title);
  const returnedTitle = normalize(result.trackName);
  const requestedArtist = normalizeArtist(artistName);
  const returnedArtist = normalizeArtist(result.artistName);

  let score = 0;
  if (requestedTitle === returnedTitle) score += 120;
  else if (requestedTitle.includes(returnedTitle) || returnedTitle.includes(requestedTitle)) score += 78;
  else {
    const parts = new Set(requestedTitle.split(' '));
    score += returnedTitle.split(' ').filter((part) => parts.has(part)).length * 18;
  }

  if (requestedArtist === returnedArtist) score += 70;
  else if (requestedArtist.includes(returnedArtist) || returnedArtist.includes(requestedArtist)) score += 42;
  else {
    const parts = new Set(requestedArtist.split(' '));
    score += returnedArtist.split(' ').filter((part) => parts.has(part)).length * 10;
  }

  return score - Math.abs(returnedTitle.length - requestedTitle.length) * 0.12;
}

async function readJson<T>(url: URL, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(url, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(url: URL, value: unknown) {
  await mkdir(dirname(url.pathname), { recursive: true });
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
}

async function searchItunes<T>(params: Record<string, string>, label: string): Promise<T[] | 'blocked'> {
  if (blocked || lookupCount >= MAX_LOOKUPS) return 'blocked';

  const elapsed = Date.now() - lastLookupAt;
  if (elapsed < 1400) await sleep(1400 - elapsed);

  const url = new URL('https://itunes.apple.com/search');
  Object.entries({ country: 'US', limit: '8', media: 'music', ...params }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  lookupCount += 1;
  lastLookupAt = Date.now();

  const response = await fetch(url, { headers: { 'User-Agent': 'EDM-Atlas-LinkEnricher/1.0' } });
  if (response.status === 403 || response.status === 429) {
    blocked = true;
    console.warn(`Provider blocked/rate-limited at ${label}: ${response.status}. Progress is cached; rerun later.`);
    return 'blocked';
  }
  if (!response.ok) {
    console.warn(`Skipping ${label}: ${response.status}`);
    return [];
  }
  const data = await response.json() as { results?: T[] };
  return data.results ?? [];
}

async function resolveAppleArtist(name: string, cache: AppleCache) {
  const key = artistKey(name);
  if (key in cache.artists) return cache.artists[key];

  let best: AppleArtistResult | null = null;
  let bestScore = -Infinity;
  for (const query of canonicalArtistQueries(name)) {
    const results = await searchItunes<AppleArtistResult>({ entity: 'musicArtist', term: query }, `artist:${query}`);
    if (results === 'blocked') return null;
    for (const result of results) {
      const score = scoreArtistResult(query, result);
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }
  }

  cache.artists[key] = best && bestScore >= 28 ? best : null;
  await writeJson(APPLE_CACHE_FILE, cache);
  return cache.artists[key];
}

async function resolveAppleTrack(artistName: string, title: string, cache: AppleCache) {
  const key = trackKey(artistName, title);
  if (key in cache.tracks) return cache.tracks[key];

  const queries = [`${artistName} ${title}`, `${canonicalArtistQueries(artistName)[0]} ${title}`];
  let best: AppleTrackResult | null = null;
  let bestScore = -Infinity;

  for (const query of [...new Set(queries)]) {
    const results = await searchItunes<AppleTrackResult>({ entity: 'song', term: query }, `track:${query}`);
    if (results === 'blocked') return null;
    for (const result of results.filter((item) => item.collectionId && item.trackId)) {
      const score = scoreTrackResult(artistName, title, result);
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }
  }

  cache.tracks[key] = best && bestScore >= 82 ? best : null;
  await writeJson(APPLE_CACHE_FILE, cache);
  return cache.tracks[key];
}

function renderArtistTracks(
  tracksByArtist: Record<string, ArtistTrackSuggestion[]>,
  spotifyCache: Record<string, SpotifyCacheEntry>
) {
  const lines = [
    "import type { ArtistTrackSuggestion } from '../types';",
    '',
    'export const ARTIST_TRACKS: Record<string, ArtistTrackSuggestion[]> = {',
  ];

  for (const artistName of Object.keys(tracksByArtist).sort((a, b) => a.localeCompare(b))) {
    lines.push(`  '${escapeTsString(artistName)}': [`);
    for (const track of tracksByArtist[artistName].slice(0, 3)) {
      const spotifyTrackId = track.spotifyTrackId ?? spotifyCache[trackKey(artistName, track.title)]?.spotifyTrackId;
      lines.push('    {');
      lines.push(`      title: '${escapeTsString(track.title)}',`);
      if (track.appleMusicAlbumId) lines.push(`      appleMusicAlbumId: '${track.appleMusicAlbumId}',`);
      if (track.appleMusicSongId) lines.push(`      appleMusicSongId: '${track.appleMusicSongId}',`);
      if (spotifyTrackId) lines.push(`      spotifyTrackId: '${spotifyTrackId}',`);
      lines.push(`      reason: '${escapeTsString(track.reason)}',`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

function patchGenresSource(source: string, appleCache: AppleCache, spotifyCache: Record<string, SpotifyCacheEntry>) {
  return source.replace(
    /\{ name: '((?:\\'|[^'])+)', importance: '((?:\\'|[^'])*)'([^}]*)\}/g,
    (match, rawName: string, importance: string, rest: string) => {
      const name = decodeTsString(rawName);
      const appleMusicArtistId = rest.includes('appleMusicArtistId')
        ? undefined
        : appleCache.artists[artistKey(name)]?.artistId;
      const spotifyArtistId = rest.includes('spotifyArtistId')
        ? undefined
        : spotifyCache[artistKey(name)]?.spotifyArtistId;
      const additions = [
        appleMusicArtistId ? `appleMusicArtistId: '${appleMusicArtistId}'` : '',
        spotifyArtistId ? `spotifyArtistId: '${spotifyArtistId}'` : '',
      ].filter(Boolean);
      if (additions.length === 0) return match;
      return `{ name: '${rawName}', importance: '${importance}'${rest.trimEnd()}, ${additions.join(', ')} }`;
    }
  );
}

async function main() {
  const appleCache = await readJson<AppleCache>(APPLE_CACHE_FILE, { artists: {}, tracks: {} });
  const spotifyCache = await readJson<Record<string, SpotifyCacheEntry>>(SPOTIFY_CACHE_FILE, {});

  const tracksByArtist: Record<string, ArtistTrackSuggestion[]> = JSON.parse(JSON.stringify(ARTIST_TRACKS));

  if (!APPLY_ONLY) {
    for (const [artistName, tracks] of Object.entries(tracksByArtist)) {
      for (const track of tracks) {
        if (track.appleMusicAlbumId && track.appleMusicSongId) continue;
        const resolved = await resolveAppleTrack(artistName, track.title, appleCache);
        if (resolved) {
          track.appleMusicAlbumId = String(resolved.collectionId);
          track.appleMusicSongId = String(resolved.trackId);
        }
        if (blocked || lookupCount >= MAX_LOOKUPS) break;
      }
      if (blocked || lookupCount >= MAX_LOOKUPS) break;
    }

    for (const artist of [...new Set(genres.flatMap((genre) => genre.artists.map((entry) => entry.name)))]) {
      if (blocked || lookupCount >= MAX_LOOKUPS) break;
      await resolveAppleArtist(artist, appleCache);
    }
  }

  await writeFile(ARTIST_TRACKS_FILE, renderArtistTracks(tracksByArtist, spotifyCache));
  const genreSource = await readFile(GENRES_FILE, 'utf8');
  await writeFile(GENRES_FILE, patchGenresSource(genreSource, appleCache, spotifyCache));

  const totalTracks = Object.values(tracksByArtist).flat().length;
  const appleTracks = Object.values(tracksByArtist).flat().filter((track) => track.appleMusicAlbumId && track.appleMusicSongId).length;
  const spotifyTracks = Object.entries(tracksByArtist).flatMap(([artistName, tracks]) =>
    tracks.map((track) => track.spotifyTrackId ?? spotifyCache[trackKey(artistName, track.title)]?.spotifyTrackId)
  ).filter(Boolean).length;

  console.log(`Lookups used       : ${lookupCount}`);
  console.log(`Apple cache artists: ${Object.keys(appleCache.artists).length}`);
  console.log(`Apple cache tracks : ${Object.keys(appleCache.tracks).length}`);
  console.log(`Tracks total       : ${totalTracks}`);
  console.log(`Tracks with Apple  : ${appleTracks}`);
  console.log(`Tracks with Spotify: ${spotifyTracks}`);
  console.log(blocked ? 'Stopped because provider blocked/rate-limited. Rerun later to resume.' : 'Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
