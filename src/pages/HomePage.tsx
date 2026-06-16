import type { Page } from '../App';

interface HomePageProps { onNavigate: (page: Page) => void; }

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(139,128,224,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,128,224,0.6) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
        }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[560px] h-[560px] rounded-full blur-[130px]" style={{ background: 'rgba(139,128,224,0.08)' }} />
      </div>

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] mb-6" style={{ color: 'var(--accent)' }}>
          An interactive music history
        </p>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-5 leading-[0.95]" style={{ color: 'var(--text-1)' }}>
          EDM <span style={{ color: 'var(--accent)' }}>Atlas</span>
        </h1>
        <p className="text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
          Explore four decades of electronic dance music — from Detroit Techno to Neurofunk,
          from Goa Trance to Grime. Navigate the connections, discover the pioneers.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button onClick={() => onNavigate('map')}
            className="px-7 py-3 min-h-11 font-semibold rounded-lg transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: '#0a0a0e' }}>
            Explore the map →
          </button>
          <button onClick={() => onNavigate('timeline')}
            className="px-7 py-3 min-h-11 font-semibold rounded-lg transition-all active:scale-95"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
            View timeline
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6">
          {[{ v: '12', l: 'Genre families' }, { v: '80+', l: 'Genres & subgenres' }, { v: '300+', l: 'Artist profiles' }].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-bold mb-1 font-mono" style={{ color: 'var(--text-1)' }}>{s.v}</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--text-3)' }}>
        Educational music-discovery project
      </div>
    </div>
  );
}
