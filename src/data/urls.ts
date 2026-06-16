export function spotifyArtistUrl(id: string): string {
  return `https://open.spotify.com/artist/${id}`;
}

export function appleMusicArtistUrl(id: string): string {
  return `https://music.apple.com/us/artist/${id}`;
}

export function spotifyTrackUrl(id: string): string {
  return `https://open.spotify.com/track/${id}`;
}

export function appleMusicSongUrl(albumId: string, songId: string): string {
  return `https://music.apple.com/us/album/${albumId}?i=${songId}`;
}

export function appleMusicTrackUrl(songId: string): string {
  return `https://music.apple.com/us/song/track/${songId}`;
}

export function spotifyAlbumUrl(id: string): string {
  return `https://open.spotify.com/album/${id}`;
}

export function appleMusicAlbumUrl(id: string): string {
  return `https://music.apple.com/us/album/${id}`;
}
