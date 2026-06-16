# EDM Atlas 🎵

An interactive, educational map of electronic dance music history — genres, subgenres, artists, and the connections between them.

## What it is

EDM Atlas is a static web app that lets you explore four decades of electronic music:

- **Genre Map** — interactive D3 force graph, drag/zoom/click for details
- **Timeline** — browse genres decade by decade, 1970s to present
- **Genre Panels** — description, origins, BPM, mood tags, essential tracks, 5+ artists per genre with Spotify & Apple Music links
- **Search & Filter** — search by genre, city, mood; filter by family

## Tech stack

- React 19 + TypeScript · Vite 8 · Tailwind CSS v4 · D3.js v7 · Lucide React
- No backend — all data is local TypeScript

## Getting started

```bash
git clone https://github.com/your-username/edm-atlas.git
cd edm-atlas
npm install
npm run dev
```

Visit `http://localhost:5173/edm-atlas/`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Deploy to GitHub Pages

### Automated (recommended)

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source** → select **GitHub Actions**.
3. The site deploys automatically on every push to `main`.

### Manual

```bash
npm run build
npx gh-pages -d dist
```

> **Note:** `base` in `vite.config.ts` is set to `/edm-atlas/`. Update it if your repo has a different name.

## Adding genres

All data is in `src/data/genres.ts`. Append a new object to the array:

```typescript
{
  id: 'your-genre-id',
  name: 'Your Genre',
  parentId: 'parent-id',     // omit for top-level
  family: 'house',           // must match a key in src/data/colors.ts
  description: '...',
  originDecade: '2010s',
  originCities: ['City'],
  influences: ['Genre A'],
  influenced: ['Genre B'],
  bpmRange: '128–135 BPM',
  moods: ['energetic'],
  beginnerFriendly: true,
  deepCut: false,
  artists: [
    {
      name: 'Artist Name',
      importance: 'Why they matter.',
      spotifyUrl: 'https://open.spotify.com/search/Artist%20Name',
      appleMusicUrl: 'https://music.apple.com/us/search?term=Artist+Name',
    },
    // add at least 5 artists
  ],
}
```

## Project structure

```
src/
├── components/
│   ├── Nav.tsx          # Navigation bar
│   └── GenrePanel.tsx   # Genre detail slide-in panel
├── data/
│   ├── genres.ts        # All genre / artist data — expand here
│   └── colors.ts        # Family color definitions
├── pages/
│   ├── HomePage.tsx
│   ├── MapPage.tsx      # D3 force graph
│   ├── TimelinePage.tsx
│   └── AboutPage.tsx
├── types/index.ts
└── App.tsx
```

## Licence

MIT — educational project, free to fork and extend.
