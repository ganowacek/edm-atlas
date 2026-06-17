export interface ExplorationPath {
  id: string;
  title: string;
  subtitle: string;
  genreIds: string[];
}

export const EXPLORATION_PATHS: ExplorationPath[] = [
  {
    id: 'disco-to-house',
    title: 'From Disco to House',
    subtitle: 'Club infrastructure, remix culture, and the birth of house.',
    genreIds: ['disco', 'house', 'deep-house', 'french-house', 'nu-disco'],
  },
  {
    id: 'uk-bass-lineage',
    title: 'The UK Bass Lineage',
    subtitle: 'Breakbeats, pirate radio, garage swing, and sub-bass mutation.',
    genreIds: ['breakbeat', 'jungle', 'drum-and-bass', 'uk-garage', 'dubstep', 'post-dubstep', 'grime'],
  },
  {
    id: 'detroit-to-berlin',
    title: 'Detroit to Berlin',
    subtitle: 'Machine soul, warehouse pressure, and harder industrial edges.',
    genreIds: ['techno', 'minimal-techno', 'dub-techno', 'industrial-techno', 'hard-techno'],
  },
  {
    id: 'dubstep-mutation',
    title: 'How Dubstep Mutated',
    subtitle: 'South London dread into festival maximalism and introspective fragments.',
    genreIds: ['uk-garage', 'dubstep', 'brostep', 'riddim', 'post-dubstep', 'future-bass'],
  },
  {
    id: 'ambient-to-idm',
    title: 'Ambient to IDM',
    subtitle: 'Listening rooms, texture, abstraction, and post-rave experimentation.',
    genreIds: ['ambient', 'ambient-house', 'idm', 'downtempo', 'chillout'],
  },
];
