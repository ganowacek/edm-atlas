import { readFile, writeFile } from 'node:fs/promises';
import { genres } from '../src/data/genres';
import { ARTIST_TRACKS as EXISTING_ARTIST_TRACKS } from '../src/data/artistTracks';

interface RoadmapArtist {
  genreName: string;
  artistName: string;
  tracks: string[];
}

interface SyncedTrack {
  title: string;
  spotifyTrackId?: string;
  reason: string;
}

const SONG_ROADMAP = process.argv.find((arg) => arg.endsWith('.txt'))
  ?? new URL('./data/roadmap-songs.txt', import.meta.url);
const ARTIST_TRACKS_FILE = new URL('../src/data/artistTracks.ts', import.meta.url);

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

function escapeTsString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

function buildTrackData(rows: RoadmapArtist[]) {
  const aliases = buildGraphArtistAliases();
  const tracksByArtist = new Map<string, SyncedTrack[]>();

  for (const row of rows) {
    const normalized = normalizeArtist(row.artistName);
    const graphNames = new Set<string>([row.artistName]);
    aliases.get(normalized)?.forEach((name) => graphNames.add(name));
    aliases.get(normalizeArtist(row.artistName.split('/')[0] ?? row.artistName))?.forEach((name) => graphNames.add(name));

    const syncedTracks = row.tracks.slice(0, 3).map((title) => ({
      title,
      spotifyTrackId: existingTrackFor(row.artistName, title)?.spotifyTrackId,
      reason: reasonFor(row.artistName, row.genreName, title),
    }));

    for (const name of graphNames) {
      const existing = tracksByArtist.get(name) ?? [];
      const seen = new Set(existing.map((track) => normalize(track.title)));
      for (const track of syncedTracks) {
        if (seen.has(normalize(track.title))) continue;
        existing.push(track);
        seen.add(normalize(track.title));
      }
      tracksByArtist.set(name, existing);
    }
  }

  return tracksByArtist;
}

function renderArtistTracks(tracksByArtist: Map<string, SyncedTrack[]>) {
  const lines = [
    "import type { ArtistTrackSuggestion } from '../types';",
    '',
    'export const ARTIST_TRACKS: Record<string, ArtistTrackSuggestion[]> = {',
  ];

  for (const [artistName, tracks] of [...tracksByArtist.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  '${escapeTsString(artistName)}': [`);
    for (const track of tracks.slice(0, 3)) {
      lines.push('    {');
      lines.push(`      title: '${escapeTsString(track.title)}',`);
      if (track.spotifyTrackId) lines.push(`      spotifyTrackId: '${track.spotifyTrackId}',`);
      lines.push(`      reason: '${escapeTsString(track.reason)}',`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  lines.push('};', '');
  return lines.join('\n');
}

async function main() {
  const roadmap = parseRoadmap(await readFile(SONG_ROADMAP, 'utf8'));
  const tracksByArtist = buildTrackData(roadmap);

  await writeFile(ARTIST_TRACKS_FILE, renderArtistTracks(tracksByArtist));

  console.log(`Roadmap artist rows: ${roadmap.length}`);
  console.log(`Artist track entries: ${tracksByArtist.size}`);
  console.log(`Resolved track rows: ${[...tracksByArtist.values()].flat().length}`);
  console.log(`Spotify IDs preserved: ${[...tracksByArtist.values()].flat().filter((track) => track.spotifyTrackId).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
