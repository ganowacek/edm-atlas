export function spotifyArtistUrl(id: string): string {
  return `https://open.spotify.com/artist/${id}`;
}

export function spotifyTrackUrl(id: string): string {
  return `https://open.spotify.com/track/${id}`;
}

export function spotifyTrackEmbedUrl(id: string): string {
  return `https://open.spotify.com/embed/track/${id}`;
}

export function spotifyAlbumUrl(id: string): string {
  return `https://open.spotify.com/album/${id}`;
}
