/**
 * Verifies Spotify links in EDM Atlas data.
 * Run with: npm run verify-links
 */

import { genres } from '../src/data/genres';
import { ARTIST_TRACKS } from '../src/data/artistTracks';
import { spotifyArtistUrl, spotifyTrackUrl } from '../src/data/urls';

const CHECK_HTTP = process.argv.includes('--check-http');

interface LinkReport {
  type: 'spotify-artist' | 'spotify-track';
  name: string;
  url: string;
  status: 'ok' | 'missing-id' | 'http-error';
  httpStatus?: number;
}

async function checkUrl(url: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'EDM-Atlas-LinkChecker/1.0' },
    });
    clearTimeout(timeout);
    return res.status;
  } catch {
    return 0;
  }
}

async function checkLink(entry: LinkReport): Promise<LinkReport> {
  if (entry.status !== 'ok' || !CHECK_HTTP) return entry;
  const httpStatus = await checkUrl(entry.url);
  return {
    ...entry,
    httpStatus,
    status: httpStatus >= 200 && httpStatus < 400 ? 'ok' : 'http-error',
  };
}

async function main() {
  console.log('\n-- EDM Atlas Spotify Link Verifier --\n');

  const artistLinks: LinkReport[] = [];
  for (const genre of genres) {
    for (const artist of genre.artists) {
      artistLinks.push(artist.spotifyArtistId
        ? { type: 'spotify-artist', name: artist.name, url: spotifyArtistUrl(artist.spotifyArtistId), status: 'ok' }
        : { type: 'spotify-artist', name: artist.name, url: '', status: 'missing-id' });
    }
  }

  const trackLinks: LinkReport[] = [];
  for (const [artistName, tracks] of Object.entries(ARTIST_TRACKS)) {
    for (const track of tracks) {
      trackLinks.push(track.spotifyTrackId
        ? { type: 'spotify-track', name: `${artistName} - ${track.title}`, url: spotifyTrackUrl(track.spotifyTrackId), status: 'ok' }
        : { type: 'spotify-track', name: `${artistName} - ${track.title}`, url: '', status: 'missing-id' });
    }
  }

  const report = CHECK_HTTP
    ? await Promise.all([...artistLinks, ...trackLinks].map(checkLink))
    : [...artistLinks, ...trackLinks];

  const ok = report.filter((r) => r.status === 'ok').length;
  const missing = report.filter((r) => r.status === 'missing-id').length;
  const httpError = report.filter((r) => r.status === 'http-error').length;
  const totalTracks = Object.values(ARTIST_TRACKS).flat().length;
  const tracksWithSpotify = Object.values(ARTIST_TRACKS).flat().filter((t) => t.spotifyTrackId).length;

  console.log('SUMMARY');
  console.log('-------');
  console.log(`  Total links checked : ${report.length}`);
  console.log(`  Valid               : ${ok}`);
  console.log(`  Missing IDs         : ${missing}`);
  if (CHECK_HTTP) console.log(`  HTTP errors         : ${httpError}`);

  console.log('\nTRACK IDs');
  console.log('---------');
  console.log(`  Total tracks        : ${totalTracks}`);
  console.log(`  With Spotify ID     : ${tracksWithSpotify}`);
  console.log(`  Without Spotify ID  : ${totalTracks - tracksWithSpotify}`);

  const missingTracks = trackLinks.filter((r) => r.status === 'missing-id');
  if (missingTracks.length) {
    console.log('\nTracks still needing Spotify IDs:');
    missingTracks.forEach((track) => console.log(`  - ${track.name}`));
  }

  if (CHECK_HTTP && httpError > 0) {
    console.log('\nHTTP errors:');
    report.filter((r) => r.status === 'http-error').forEach((r) => {
      console.log(`  [${r.httpStatus}] ${r.type} - ${r.name}: ${r.url}`);
    });
  }

  console.log('\nDone.\n');
  process.exit(httpError > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
