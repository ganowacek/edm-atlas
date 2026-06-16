export interface Artist {
  name: string;
  importance: string;
  spotifyUrl: string;
  appleMusicUrl: string;
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
  essentialTracks?: string[];
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
