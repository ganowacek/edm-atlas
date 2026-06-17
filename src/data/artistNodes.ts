import type { ArtistNode, Genre, TrackNode } from '../types';
import { ARTIST_TRACKS } from './artistTracks';
import { spotifyArtistUrl, spotifyTrackEmbedUrl, spotifyTrackUrl } from './urls';

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function trackNodesForArtist(artistName: string, genre: Genre): TrackNode[] {
  return (ARTIST_TRACKS[artistName] ?? []).slice(0, 3).map((track) => ({
    ...track,
    id: `track:${genre.id}:${slugify(artistName)}:${slugify(track.title)}`,
    artistName,
    spotifyUrl: track.spotifyTrackId ? spotifyTrackUrl(track.spotifyTrackId) : undefined,
    spotifyEmbedUrl: track.spotifyTrackId ? spotifyTrackEmbedUrl(track.spotifyTrackId) : undefined,
    genreId: genre.id,
    genreName: genre.name,
    family: genre.family,
  }));
}

export function keyArtistNodesForGenre(genre: Genre): ArtistNode[] {
  return genre.artists.map((artist) => ({
    id: `artist:${genre.id}:${slugify(artist.name)}`,
    name: artist.name,
    importance: artist.importance,
    history: [
      artist.importance,
      `${artist.name} appears here through the ${genre.name} branch, where the surrounding scene was shaped by ${genre.originCities.slice(0, 2).join(' and ') || 'its core club communities'}.`,
      ...(genre.history?.slice(0, 1) ?? []),
    ],
    spotifyUrl: artist.spotifyArtistId ? spotifyArtistUrl(artist.spotifyArtistId) : undefined,
    tracks: trackNodesForArtist(artist.name, genre),
    genreId: genre.id,
    genreName: genre.name,
    family: genre.family,
    primary: true,
  }));
}

function moreArtistNodesForGenre(genre: Genre): ArtistNode[] {
  return (genre.moreArtists ?? []).map((name) => ({
    id: `artist:${genre.id}:${slugify(name)}`,
    name,
    importance: `${name} is part of the broader ${genre.name} listening path in EDM Atlas.`,
    history: [
      `${name} is part of the broader ${genre.name} listening path in EDM Atlas.`,
      `${genre.name} is connected to ${genre.influences.slice(0, 3).join(', ') || 'the wider electronic music lineage'} and helped shape ${genre.influenced.slice(0, 3).join(', ') || 'later club sounds'}.`,
      ...(genre.history?.slice(0, 1) ?? []),
    ],
    tracks: trackNodesForArtist(name, genre),
    genreId: genre.id,
    genreName: genre.name,
    family: genre.family,
    primary: false,
  }));
}

export function artistNodesForGenre(genre: Genre): ArtistNode[] {
  const seen = new Set<string>();
  return [...keyArtistNodesForGenre(genre), ...moreArtistNodesForGenre(genre)].filter((artist) => {
    const key = artist.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listsArtist(genre: Genre, name: string): boolean {
  const lower = name.toLowerCase();
  return genre.artists.some((a) => a.name.toLowerCase() === lower)
    || (genre.moreArtists ?? []).some((n) => n.toLowerCase() === lower);
}

/**
 * Top-level families that have their own subgenres never get a direct artist
 * branch in the graph (the subgenre ring takes that role instead), so a key
 * artist anchored only on that family has no rendered node to jump to.
 */
export function isRenderableArtistHost(genre: Genre, allGenres: Genre[]): boolean {
  if (genre.parentId) return true;
  return !allGenres.some((g) => g.parentId === genre.id);
}

/**
 * Resolves which genre a key/more artist's node should live under: the
 * genre itself when it already renders an artist branch, a subgenre that
 * already lists the same artist, or any other genre in the dataset that
 * does. Falls back to the original genre so a node can still be created
 * for artists that exist nowhere else.
 */
export function findArtistAnchor(genre: Genre, artistName: string, allGenres: Genre[]): Genre {
  if (isRenderableArtistHost(genre, allGenres)) return genre;
  const children = allGenres.filter((g) => g.parentId === genre.id);
  const inChild = children.find((c) => listsArtist(c, artistName));
  if (inChild) return inChild;
  const elsewhere = allGenres.find(
    (g) => g.id !== genre.id && isRenderableArtistHost(g, allGenres) && listsArtist(g, artistName)
  );
  if (elsewhere) return elsewhere;
  return genre;
}

/**
 * Key artists belonging to a family that aren't represented by any of its
 * subgenres — these need a node created directly under the family itself.
 */
export function orphanKeyArtistsForFamily(family: Genre, allGenres: Genre[]): ArtistNode[] {
  if (isRenderableArtistHost(family, allGenres)) return [];
  const children = allGenres.filter((g) => g.parentId === family.id);
  return keyArtistNodesForGenre(family).filter(
    (artist) => !children.some((c) => listsArtist(c, artist.name))
  );
}
