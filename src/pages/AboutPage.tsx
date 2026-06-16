import { Code, Music, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">About EDM Atlas</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-5 text-gray-300 leading-relaxed">
          <p>
            <strong className="text-white">EDM Atlas</strong> is an educational, interactive music-discovery project
            that maps the history and connections of electronic dance music from the 1970s to the present day.
          </p>

          <p>
            The goal is to make EDM's complex family tree navigable — whether you're a newcomer wanting
            to understand what connects Disco to Deep House, or a long-time fan curious about the roots
            of Neurofunk or the lineage of Grime.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold text-white">How to use it</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-violet-300">Genre Map</strong> — an interactive force graph.
                Drag nodes, zoom in/out, click a genre to see its history and artists.
              </li>
              <li>
                <strong className="text-violet-300">Timeline</strong> — browse genres decade by decade.
                See what was happening musically in the 1970s through to today.
              </li>
              <li>
                <strong className="text-violet-300">Genre Panels</strong> — each genre shows a description,
                origin info, key artists with Spotify and Apple Music links, and essential tracks.
              </li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
            <h2 className="text-lg font-semibold text-white">Data & Sources</h2>
            <p className="text-sm">
              All genre information is synthesised from publicly available historical sources and is intended
              as an introductory educational guide. Where musical history is contested or uncertain, language
              like "often traced to" or "associated with" is used rather than definitive claims. This is not
              an authoritative academic resource — it is a starting point for exploration.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
            <h2 className="text-lg font-semibold text-white">Expanding the Data</h2>
            <p className="text-sm">
              The genre data lives in <code className="text-violet-300 bg-white/10 px-1 rounded">src/data/genres.ts</code>.
              Adding a new genre is as simple as adding a new object to the array. Pull requests are welcome.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <Code size={16} />
              View on GitHub
            </a>
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors text-sm"
            >
              <Music size={16} />
              Explore on Spotify
            </a>
            <a
              href="https://music.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-pink-400 transition-colors text-sm"
            >
              <Globe size={16} />
              Apple Music
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
