# Changelog

All notable changes to **EDM Atlas** are documented here. This project loosely
follows [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-06-17

The "Full Catalog" release. EDM Atlas grows from a focused starter map into a
comprehensive, deeply annotated atlas of electronic music spanning eight
decades.

### The expansion

- **Genre catalog grown from ~50 to 188 genres & subgenres.** Added 137 new
  entries sourced from Wikipedia's *Timeline of electronic music genres* and
  *List of electronic music genres*, covering the full lineage from the 1940s
  avant-garde (musique concrète, electroacoustic, acousmatic) through house,
  techno, trance, jungle/D&B, dubstep and bass music, hardcore continuum,
  industrial/EBM, and modern global scenes (Gqom, Amapiano, Hyperpop, Future
  rave, and more).
- **Deep history for every genre.** All 188 genres now carry a rich enrichment
  payload: a multi-sentence `history`, a `soundProfile`, `sceneNotes`, real
  record `labels`, and additional notable `moreArtists` — researched from
  Wikipedia and the linked per-genre articles.
- **941 artist entries** across the catalog, each with a one-line note on why
  the act matters to that specific genre.
- **Parent/child graph validated** — every `parentId` resolves to a real node,
  with no duplicates or dangling references.

### Features & pages

- **Timeline page** generalized to bucket genres by decade parsed from
  descriptive origin strings (e.g. "Late 1990s"), extended back to the 1940s,
  with a new family filter.
- **Home page** updated with accurate scope (180+ genres, 900+ artists, 20
  families) and a broadened tagline covering the full timeline.
- **About page** updated with the expanded scope and Wikipedia data-source
  credits.
- **README** updated with the new genre count, scope, and data sources.

### Foundation (carried over since the initial commit)

The following capabilities were built up across the 0.x series and are part of
this release:

- Interactive D3 force-directed genre **graph** with progressive disclosure,
  focus mode, and responsive layout.
- **Artist nodes** and artist track branches wired into the graph and detail
  panels.
- **Essential tracks** and Spotify links across genres and artists.
- **Rabbit-hole navigation**, exploration history, and guided map discovery
  tools.
- **Search** that expands the relevant branch automatically.
- **Light/dark theme** toggle with shared tint styling.

## [1.0.0] — 2026-06-15

- Initial release: EDM Atlas force-directed genre map with the founding genre
  dataset, detail panels, and timeline.
