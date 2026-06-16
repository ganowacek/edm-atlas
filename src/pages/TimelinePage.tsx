import { useState } from 'react';
import genres from '../data/genres';
import { getFamilyColor, tintStyle } from '../data/colors';
import type { Genre } from '../types';
import DetailPanel from '../components/DetailPanel';

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const LABELS: Record<string, string> = {
  '1970s': 'The Roots', '1980s': 'The Birth', '1990s': 'The Golden Age',
  '2000s': 'The Expansion', '2010s': 'The Mainstream Era', '2020s': 'The Present',
};
const DESC: Record<string, string> = {
  '1970s': 'Disco, early electronic experimentation, Kraftwerk — the foundations of everything that followed.',
  '1980s': 'House and techno are born in Chicago and Detroit. Electro, EBM, and synth-pop emerge globally.',
  '1990s': 'Explosion — UK rave, jungle, D&B, trance, gabber, trip-hop, ambient house, and more.',
  '2000s': 'Dubstep, nu-electro, progressive house, nu-disco, grime — genres splinter and globalise.',
  '2010s': 'Festival EDM dominates; underground refines with hard techno, melodic techno, future bass.',
  '2020s': 'Hard techno revival, Afro house boom, and ongoing genre hybridisation.',
};
const BEGINNER_BADGE_STYLE = tintStyle('#40b89a', 18, 34);
const DEEP_BADGE_STYLE = tintStyle('#d4ad4a', 18, 34);

export default function TimelinePage() {
  const [decade, setDecade] = useState('1990s');
  const [selected, setSelected] = useState<Genre | null>(null);

  const inDecade = genres.filter((g) => g.originDecade === decade);
  const byFamily: Record<string, Genre[]> = {};
  inDecade.forEach((g) => { (byFamily[g.family] ??= []).push(g); });

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>Timeline</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>Electronic dance music, decade by decade.</p>

        {/* decade rail */}
        <div className="relative mb-10">
          <div className="absolute top-5 left-0 right-0 h-px" style={{ background: 'var(--border)' }} />
          <div className="flex justify-between relative">
            {DECADES.map((d) => {
              const count = genres.filter((g) => g.originDecade === d).length;
              const sel = decade === d;
              return (
                <button key={d} onClick={() => setDecade(d)} className="flex flex-col items-center gap-2 group">
                  <div className="w-10 h-10 rounded-full border flex items-center justify-center z-10 transition-all"
                    style={{
                      background: sel ? 'var(--accent)' : 'var(--surface-1)',
                      borderColor: sel ? 'var(--accent)' : 'var(--border-strong)',
                      boxShadow: sel ? '0 0 18px rgba(139,128,224,0.4)' : 'none',
                    }}>
                    <span className="text-xs font-bold font-mono" style={{ color: sel ? 'var(--accent-contrast)' : 'var(--text-2)' }}>{count}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: sel ? 'var(--text-1)' : 'var(--text-3)' }}>{d}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{decade}</h2>
            <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{LABELS[decade]}</span>
          </div>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--text-2)' }}>{DESC[decade]}</p>
        </div>

        <div className="space-y-7">
          {Object.entries(byFamily).map(([fam, list]) => {
            const col = getFamilyColor(fam);
            return (
              <div key={fam}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.primary }} />
                  <h3 className="font-semibold capitalize text-sm" style={{ color: 'var(--text-1)' }}>{fam}</h3>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{list.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {list.map((g) => (
                    <button key={g.id} onClick={() => setSelected(g)}
                      className="text-left p-3.5 rounded-xl border transition-all hover:scale-[1.01]"
                      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{g.name}</h4>
                        <div className="flex gap-1 flex-shrink-0">
                          {g.beginnerFriendly && <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={BEGINNER_BADGE_STYLE}>beginner</span>}
                          {g.deepCut && <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={DEEP_BADGE_STYLE}>deep</span>}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>{g.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                        {g.bpmRange && <span>{g.bpmRange}</span>}<span>·</span><span>{g.originCities[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DetailPanel genre={selected} onClose={() => setSelected(null)} allGenres={genres} />
    </div>
  );
}
