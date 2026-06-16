/**
 * Verifies all Spotify and Apple Music links in EDM Atlas data.
 * Run with: npm run verify-links
 *
 * Reports:
 * - Artists missing canonical IDs
 * - Tracks missing Spotify IDs
 * - HTTP status of each link (when --check-http flag is passed)
 * - Any remaining search URLs (should be zero)
 */

import { genres } from '../src/data/genres';
import { ARTIST_TRACKS } from '../src/data/artistTracks';
import {
  spotifyArtistUrl,
  appleMusicArtistUrl,
  spotifyTrackUrl,
  appleMusicSongUrl,
} from '../src/data/urls';

const CHECK_HTTP = process.argv.includes('--check-http');
const SEARCH_URL_PATTERNS = [
  /open\.spotify\.com\/search/,
  /music\.apple\.com\/us\/search/,
];

interface LinkReport {
  type: string;
  name: string;
  url: string;
  status: 'ok' | 'missing-id' | 'search-url' | 'http-error';
  httpStatus?: number;
}

const report: LinkReport[] = [];
let searchUrlCount = 0;
let missingIdCount = 0;

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

function isSearchUrl(url: string): boolean {
  return SEARCH_URL_PATTERNS.some((p) => p.test(url));
}

async function checkLink(entry: Omit<LinkReport, 'httpStatus'>): Promise<LinkReport> {
  if (entry.status !== 'ok') return entry;
  if (!CHECK_HTTP) return entry;

  const httpStatus = await checkUrl(entry.url);
  return {
    ...entry,
    httpStatus,
    status: httpStatus >= 200 && httpStatus < 400 ? 'ok' : 'http-error',
  };
}

async function main() {
  console.log('\n── EDM Atlas Link Verifier ──\n');

  // 1. Check all primary artists in genres
  const artistLinks: Omit<LinkReport, 'httpStatus'>[] = [];
  for (const genre of genres) {
    for (const artist of genre.artists) {
      // Spotify artist
      if (artist.spotifyArtistId) {
        const url = spotifyArtistUrl(artist.spotifyArtistId);
        artistLinks.push({ type: 'spotify-artist', name: artist.name, url, status: 'ok' });
      } else {
        artistLinks.push({ type: 'spotify-artist', name: artist.name, url: '', status: 'missing-id' });
        missingIdCount++;
      }

      // Apple Music artist
      if (artist.appleMusicArtistId) {
        const url = appleMusicArtistUrl(artist.appleMusicArtistId);
        artistLinks.push({ type: 'apple-artist', name: artist.name, url, status: 'ok' });
      } else {
        artistLinks.push({ type: 'apple-artist', name: artist.name, url: '', status: 'missing-id' });
        missingIdCount++;
      }
    }
  }

  // 2. Check all tracks
  const trackLinks: Omit<LinkReport, 'httpStatus'>[] = [];
  for (const [artistName, tracks] of Object.entries(ARTIST_TRACKS)) {
    for (const track of tracks) {
      // Apple Music song (required)
      const amUrl = appleMusicSongUrl(track.appleMusicAlbumId, track.appleMusicSongId);
      if (isSearchUrl(amUrl)) {
        trackLinks.push({ type: 'apple-track', name: `${artistName} – ${track.title}`, url: amUrl, status: 'search-url' });
        searchUrlCount++;
      } else {
        trackLinks.push({ type: 'apple-track', name: `${artistName} – ${track.title}`, url: amUrl, status: 'ok' });
      }

      // Spotify track (optional)
      if (track.spotifyTrackId) {
        const spUrl = spotifyTrackUrl(track.spotifyTrackId);
        trackLinks.push({ type: 'spotify-track', name: `${artistName} – ${track.title}`, url: spUrl, status: 'ok' });
      } else {
        trackLinks.push({ type: 'spotify-track', name: `${artistName} – ${track.title}`, url: '', status: 'missing-id' });
      }
    }
  }

  // Verify HTTP if requested
  const allLinks = CHECK_HTTP
    ? await Promise.all([...artistLinks, ...trackLinks].map(checkLink))
    : ([...artistLinks, ...trackLinks] as LinkReport[]);

  report.push(...allLinks);

  // Summarise
  const byStatus = {
    ok: report.filter((r) => r.status === 'ok').length,
    missingId: report.filter((r) => r.status === 'missing-id').length,
    searchUrl: report.filter((r) => r.status === 'search-url').length,
    httpError: report.filter((r) => r.status === 'http-error').length,
  };

  console.log('SUMMARY');
  console.log('-------');
  console.log(`  Total links checked : ${report.length}`);
  console.log(`  ✓ Valid             : ${byStatus.ok}`);
  console.log(`  ⚠ Missing IDs       : ${byStatus.missingId}`);
  console.log(`  ✗ Search URLs       : ${byStatus.searchUrl}`);
  if (CHECK_HTTP) {
    console.log(`  ✗ HTTP errors       : ${byStatus.httpError}`);
  }

  // Artists with IDs
  const withIds = genres.flatMap((g) => g.artists).filter((a) => a.spotifyArtistId || a.appleMusicArtistId);
  const withoutIds = genres.flatMap((g) => g.artists).filter((a) => !a.spotifyArtistId && !a.appleMusicArtistId);

  console.log(`\nARTIST IDs`);
  console.log('----------');
  console.log(`  Artists with IDs   : ${withIds.length}`);
  console.log(`  Artists without IDs: ${withoutIds.length}`);

  if (withIds.length > 0) {
    console.log('\n  Artists with canonical IDs:');
    const seen = new Set<string>();
    for (const a of withIds) {
      if (seen.has(a.name)) continue;
      seen.add(a.name);
      const sp = a.spotifyArtistId ? `Spotify:${a.spotifyArtistId}` : 'Spotify:—';
      const am = a.appleMusicArtistId ? `AM:${a.appleMusicArtistId}` : 'AM:—';
      console.log(`    ${a.name.padEnd(30)} ${sp}  ${am}`);
    }
  }

  if (withoutIds.length > 0) {
    console.log('\n  Artists needing IDs (first 20):');
    const seen = new Set<string>();
    for (const a of withoutIds.slice(0, 20)) {
      if (seen.has(a.name)) continue;
      seen.add(a.name);
      console.log(`    - ${a.name}`);
    }
    if (withoutIds.length > 20) {
      console.log(`    ... and ${withoutIds.length - 20} more`);
    }
  }

  // Tracks
  console.log(`\nTRACK IDs (from ARTIST_TRACKS)`);
  console.log('------------------------------');
  const totalTracks = Object.values(ARTIST_TRACKS).flat().length;
  const tracksWithSpotify = Object.values(ARTIST_TRACKS).flat().filter((t) => t.spotifyTrackId).length;
  console.log(`  Total tracks       : ${totalTracks}`);
  console.log(`  With Spotify ID    : ${tracksWithSpotify}`);
  console.log(`  Without Spotify ID : ${totalTracks - tracksWithSpotify}`);

  if (byStatus.searchUrl > 0) {
    console.log('\n✗ SEARCH URLS FOUND (must be fixed):');
    report.filter((r) => r.status === 'search-url').forEach((r) => {
      console.log(`  [${r.type}] ${r.name}: ${r.url}`);
    });
  } else {
    console.log('\n✓ No search URLs found — all links use canonical IDs or direct URLs.');
  }

  if (CHECK_HTTP && byStatus.httpError > 0) {
    console.log('\n✗ HTTP ERRORS:');
    report.filter((r) => r.status === 'http-error').forEach((r) => {
      console.log(`  [${r.httpStatus}] ${r.type} – ${r.name}: ${r.url}`);
    });
  }

  console.log('\nDone.\n');
  process.exit(byStatus.searchUrl > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
