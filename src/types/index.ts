export interface Artist {
  name: string;
  importance: string;
  spotifyArtistId?: string;
}

export interface ArtistTrackSuggestion {
  title: string;
  spotifyTrackId?: string;
  reason: string;
}

export interface TrackNode extends ArtistTrackSuggestion {
  id: string;
  artistName: string;
  genreId: string;
  genreName: string;
  family: string;
  spotifyUrl?: string;
  spotifyEmbedUrl?: string;
}

export interface ArtistNode {
  id: string;
  name: string;
  importance: string;
  history: string[];
  spotifyUrl?: string;
  tracks: TrackNode[];
  genreId: string;
  genreName: string;
  family: string;
  primary: boolean;
}

export interface EssentialTrack {
  title: string;
  artist: string;
  spotifyTrackId?: string;
  reason: string;
}

export interface Genre {
  id: string;
  name: string;
  parentId?: string;
  family: string;
  description: string;
  originDecade: string;
  originCities: string[];
  influences: string[];
  influenced: string[];
  bpmRange?: string;
  moods: string[];
  beginnerFriendly: boolean;
  deepCut: boolean;
  artists: Artist[];
  essentialTracks?: EssentialTrack[];
  history?: string[];
  soundProfile?: string[];
  sceneNotes?: string[];
  labels?: string[];
  moreArtists?: string[];
}

export interface FamilyColor {
  primary: string;
  glow: string;
  text: string;
}

export type FamilyColorMap = Record<string, FamilyColor>;
