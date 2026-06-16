import type { Page } from '../App';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-700/10 blur-[120px]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <p className="text-violet-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">
          An Interactive Music History
        </p>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-4 leading-none">
          EDM
          <br />
          <span className="text-violet-400">ATLAS</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
          Explore four decades of electronic dance music — from Detroit Techno to Neurofunk,
          from Goa Trance to Grime. Navigate the connections, discover the pioneers.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate('map')}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-95"
          >
            Explore the Map →
          </button>
          <button
            onClick={() => onNavigate('timeline')}
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-lg transition-all active:scale-95"
          >
            View Timeline
          </button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { value: '12', label: 'Genre Families' },
            { value: '80+', label: 'Genres & Subgenres' },
            { value: '300+', label: 'Artist Profiles' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-600 text-xs">
        Educational music discovery project
      </div>
    </div>
  );
}
