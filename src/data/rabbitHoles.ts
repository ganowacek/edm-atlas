import type { Artist, Genre, TrackNode } from '../types';
import type { ExplorationPath } from './explorationPaths';
import { EXPLORATION_PATHS } from './explorationPaths';

function overlap(a: string[], b: string[]) {
  const bSet = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => bSet.has(item.toLowerCase())).length;
}

function decadeDistance(a: string, b: string) {
  const aYear = Number(a.slice(0, 4));
  const bYear = Number(b.slice(0, 4));
  if (Number.isNaN(aYear) || Number.isNaN(bYear)) return 0;
  return Math.abs(aYear - bYear) / 10;
}

function relationScore(source: Genre, candidate: Genre) {
  let score = 0;
  if (source.family === candidate.family) score += 5;
  if (source.parentId && source.parentId === candidate.parentId) score += 4;
  if (source.parentId === candidate.id || candidate.parentId === source.id) score += 5;
  score += overlap(source.moods, candidate.moods) * 3;
  score += overlap(source.influences, candidate.influences) * 2;
  score += overlap(source.influenced, candidate.influenced) * 2;
  score += overlap(source.influenced, [candidate.name]) * 5;
  score += overlap(candidate.influenced, [source.name]) * 5;
  score += overlap(source.soundProfile ?? [], candidate.soundProfile ?? []) * 2;
  score += Math.max(0, 3 - decadeDistance(source.originDecade, candidate.originDecade));
  return score;
}

export function closestGenreCousins(source: Genre, genres: Genre[], limit = 4) {
  return genres
    .filter((genre) => genre.id !== source.id)
    .map((genre) => ({ genre, score: relationScore(source, genre) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.genre.name.localeCompare(b.genre.name))
    .slice(0, limit)
    .map((entry) => entry.genre);
}

const MOOD_ROUTE_DEFS: Array<{ id: string; title: string; subtitle: string; terms: string[] }> = [
  {
    id: 'dark-machine-pressure',
    title: 'Dark Machine Pressure',
    subtitle: 'Industrial edges, techno force, and engineered low-end.',
    terms: ['dark', 'driving', 'mechanical', 'industrial', 'hypnotic', 'aggressive'],
  },
  {
    id: 'sunrise-melodic',
    title: 'Sunrise Melodic Drift',
    subtitle: 'Emotional arcs, warm chords, and euphoric release.',
    terms: ['euphoric', 'melodic', 'emotional', 'uplifting', 'warm', 'dreamy'],
  },
  {
    id: 'bass-rabbit-hole',
    title: 'Bass Rabbit Hole',
    subtitle: 'UK pressure, sub-bass mutation, and broken rhythm.',
    terms: ['bass', 'sub-bass', 'breakbeat', 'dark', 'syncopated', 'energetic'],
  },
  {
    id: 'headphones-weird',
    title: 'Weird Headphones Music',
    subtitle: 'Texture, abstraction, post-rave experiments, and close listening.',
    terms: ['abstract', 'experimental', 'atmospheric', 'introspective', 'textural', 'weird'],
  },
  {
    id: 'hands-in-air',
    title: 'Hands-in-the-Air History',
    subtitle: 'Anthems, big hooks, festival scale, and euphoric peaks.',
    terms: ['euphoric', 'anthemic', 'festival', 'energetic', 'uplifting', 'big-room'],
  },
];

function genreMoodScore(genre: Genre, terms: string[]) {
  const searchable = [
    genre.name,
    genre.family,
    ...genre.moods,
    ...(genre.soundProfile ?? []),
    ...(genre.sceneNotes ?? []),
    genre.description,
  ].join(' ').toLowerCase();

  return terms.reduce((score, term) => score + (searchable.includes(term.toLowerCase()) ? 1 : 0), 0);
}

export function moodExplorationPaths(genres: Genre[]): ExplorationPath[] {
  return MOOD_ROUTE_DEFS.map((route) => {
    const genreIds = genres
      .map((genre) => ({ genre, score: genreMoodScore(genre, route.terms) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.genre.originDecade.localeCompare(b.genre.originDecade))
      .slice(0, 6)
      .map((entry) => entry.genre.id);

    return { ...route, genreIds };
  }).filter((route) => route.genreIds.length >= 3);
}

export function relatedArtists(artistName: string, genre: Genre, limit = 5): Artist[] {
  return genre.artists
    .filter((artist) => artist.name.toLowerCase() !== artistName.toLowerCase())
    .slice(0, limit);
}

export interface GenreDnaItem {
  label: string;
  value: string;
  tone: 'rhythm' | 'texture' | 'energy' | 'scene';
}

function rhythmDna(genre: Genre) {
  const profile = [...(genre.soundProfile ?? []), ...genre.moods, genre.description].join(' ').toLowerCase();
  if (profile.includes('break') || profile.includes('syncop') || profile.includes('amen')) return 'broken / syncopated';
  if (profile.includes('half-time') || profile.includes('halftime')) return 'half-time weight';
  if (profile.includes('beatless') || profile.includes('ambient')) return 'beatless / drifting';
  if (profile.includes('4/4') || profile.includes('four-on-the-floor') || genre.family === 'house' || genre.family === 'techno') return 'four-on-the-floor';
  return genre.bpmRange ? `${genre.bpmRange}` : 'variable pulse';
}

function textureDna(genre: Genre) {
  const profile = [...(genre.soundProfile ?? []), ...genre.moods, genre.description].join(' ').toLowerCase();
  if (profile.includes('distort') || profile.includes('industrial') || profile.includes('metallic')) return 'abrasive / metallic';
  if (profile.includes('dub') || profile.includes('echo') || profile.includes('reverb')) return 'dubwise / spacious';
  if (profile.includes('vocal') || profile.includes('soul')) return 'vocal / soulful';
  if (profile.includes('pad') || profile.includes('atmos')) return 'atmospheric';
  return genre.soundProfile?.[0] ?? genre.moods[0] ?? 'club-focused';
}

function energyDna(genre: Genre) {
  const moods = genre.moods.join(' ').toLowerCase();
  if (genre.deepCut) return 'deep-dive';
  if (moods.includes('aggressive') || moods.includes('driving') || moods.includes('energetic')) return 'high-pressure';
  if (moods.includes('euphoric') || moods.includes('uplifting')) return 'euphoric lift';
  if (moods.includes('introspective') || moods.includes('melancholic')) return 'introspective';
  return genre.beginnerFriendly ? 'gateway-friendly' : 'specialist';
}

export function genreDna(genre: Genre): GenreDnaItem[] {
  return [
    { label: 'Rhythm', value: rhythmDna(genre), tone: 'rhythm' },
    { label: 'Texture', value: textureDna(genre), tone: 'texture' },
    { label: 'Energy', value: energyDna(genre), tone: 'energy' },
    { label: 'Scene', value: genre.originCities.slice(0, 2).join(' / ') || genre.originDecade, tone: 'scene' },
  ];
}

export function trackContextTags(track: TrackNode) {
  const text = `${track.title} ${track.reason} ${track.genreName} ${track.family}`.toLowerCase();
  const tags = new Set<string>();
  if (text.includes('303') || text.includes('acid')) tags.add('303 acid line');
  if (text.includes('break') || text.includes('jungle') || text.includes('amen')) tags.add('breakbeat science');
  if (text.includes('sub-bass') || text.includes('sub bass') || text.includes('dubstep')) tags.add('sub-bass pressure');
  if (text.includes('vocal') || text.includes('soul')) tags.add('vocal hook');
  if (text.includes('filter') || text.includes('disco')) tags.add('filter-disco loop');
  if (text.includes('industrial') || text.includes('distorted') || text.includes('hard')) tags.add('distorted impact');
  if (text.includes('melodic') || text.includes('emotional') || text.includes('euphoric')) tags.add('melodic lift');
  if (text.includes('ambient') || text.includes('atmospheric')) tags.add('atmospheric texture');
  if (text.includes('festival') || text.includes('mainstream')) tags.add('crossover moment');
  return [...tags].slice(0, 5);
}

export function pathOfDay(genres: Genre[], now = new Date()): ExplorationPath {
  const paths = [...EXPLORATION_PATHS, ...moodExplorationPaths(genres)];
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return paths[dayNumber % paths.length];
}

export function questTracks(genres: Genre[], limit = 5) {
  return genres
    .flatMap((genre) => (genre.essentialTracks ?? []).map((track) => ({ genre, track })))
    .filter((entry) => entry.track.spotifyTrackId)
    .sort((a, b) => {
      const aScore = (a.genre.beginnerFriendly ? 0 : 1) + (a.genre.deepCut ? 2 : 0);
      const bScore = (b.genre.beginnerFriendly ? 0 : 1) + (b.genre.deepCut ? 2 : 0);
      return aScore - bScore || a.genre.originDecade.localeCompare(b.genre.originDecade);
    })
    .slice(0, limit);
}
