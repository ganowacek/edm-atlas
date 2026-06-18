import { Code, Music } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-1)' }}>About EDM Atlas</h1>
        <div className="space-y-5 leading-relaxed text-sm" style={{ color: 'var(--text-2)' }}>
          <p><strong style={{ color: 'var(--text-1)' }}>EDM Atlas</strong> is an educational, interactive music-discovery project that maps the history and connections of electronic music — over 180 genres and subgenres across 20 families, from the 1940s avant-garde to today's club and festival sounds.</p>
          <p>The goal is to make this complex family tree navigable — whether you're a newcomer wanting to understand what connects Disco to Deep House, or a long-time fan tracing the roots of Neurofunk, the lineage of Grime, or how musique concrète and Krautrock seeded everything that followed.</p>

          <div className="rounded-xl p-5 space-y-3 border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>How to use it</h2>
            <ul className="space-y-2">
              <li><strong style={{ color: 'var(--accent)' }}>Genre Map</strong> — start with the 20 families. Click one to expand its branches; hover to trace connections; click any node for details.</li>
              <li><strong style={{ color: 'var(--accent)' }}>Timeline</strong> — browse genres decade by decade.</li>
              <li><strong style={{ color: 'var(--accent)' }}>Search</strong> — jump to any genre or artist; the map expands the right branch automatically.</li>
            </ul>
          </div>

          <div className="rounded-xl p-5 space-y-2 border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Data & sources</h2>
            <p>All genre information is synthesised from publicly available historical sources — including Wikipedia's "Timeline of electronic music genres" and "List of electronic music genres" and the linked articles for each genre — as an introductory guide. Where history is contested, language like "often traced to" is used rather than definitive claims. This is a starting point for exploration, not an authoritative academic resource.</p>
          </div>

          <div className="rounded-xl p-5 space-y-2 border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Expanding the data</h2>
            <p>Genre data lives in <code className="px-1 rounded" style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}>src/data/genres.ts</code>. Adding a genre is as simple as appending an object to the array.</p>
          </div>

          <div className="flex items-center gap-5 pt-2">
            <a href="https://github.com/ganowacek/edm-atlas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors" style={{ color: 'var(--text-3)' }}><Code size={15} />GitHub</a>
            <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors" style={{ color: 'var(--text-3)' }}><Music size={15} />Spotify</a>
          </div>
        </div>
      </div>
    </div>
  );
}
