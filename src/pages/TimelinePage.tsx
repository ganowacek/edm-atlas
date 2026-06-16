import { useState } from 'react';
import genres from '../data/genres';
import { getFamilyColor } from '../data/colors';
import type { Genre } from '../types';

interface TimelinePageProps {
  onSelectGenre: (genre: Genre) => void;
}

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

const DECADE_LABELS: Record<string, string> = {
  '1970s': 'The Roots',
  '1980s': 'The Birth',
  '1990s': 'The Golden Age',
  '2000s': 'The Expansion',
  '2010s': 'The Mainstream Era',
  '2020s': 'The Present',
};

const DECADE_DESC: Record<string, string> = {
  '1970s': 'Disco, early electronic experimentation, Kraftwerk, the foundations of everything that followed.',
  '1980s': 'House and techno are born in Chicago and Detroit. Electro, EBM, and synth-pop emerge globally.',
  '1990s': 'Explosion — UK rave, jungle, D&B, trance, gabber, trip-hop, ambient house, and more.',
  '2000s': 'Dubstep, nu-electro, progressive house, nu-disco, grime — genres splinter and globalise.',
  '2010s': 'Festival EDM dominates mainstream; underground scenes refine and resist with hard techno, melodic techno, future bass.',
  '2020s': 'Hard techno revival, Afro house boom, and ongoing genre hybridisation.',
};

export default function TimelinePage({ onSelectGenre }: TimelinePageProps) {
  const [selectedDecade, setSelectedDecade] = useState<string>('1990s');

  const genresInDecade = genres.filter((g) => g.originDecade === selectedDecade);

  // Group by family
  const byFamily: Record<string, Genre[]> = {};
  genresInDecade.forEach((g) => {
    if (!byFamily[g.family]) byFamily[g.family] = [];
    byFamily[g.family].push(g);
  });

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">EDM Timeline</h1>
          <p className="text-gray-400">Explore electronic dance music decade by decade.</p>
        </div>

        {/* Decade selector */}
        <div className="relative mb-12">
          {/* Timeline bar */}
          <div className="absolute top-5 left-0 right-0 h-px bg-white/10" />

          <div className="flex justify-between relative">
            {DECADES.map((decade) => {
              const count = genres.filter((g) => g.originDecade === decade).length;
              const isSelected = selectedDecade === decade;
              return (
                <button
                  key={decade}
                  onClick={() => setSelectedDecade(decade)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all z-10 relative ${
                      isSelected
                        ? 'bg-violet-600 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                        : 'bg-gray-900 border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isSelected ? 'text-violet-300' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                  >
                    {decade}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected decade content */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white">{selectedDecade}</h2>
            <span className="text-violet-400 font-semibold">{DECADE_LABELS[selectedDecade]}</span>
          </div>
          <p className="text-gray-400 text-sm max-w-2xl">{DECADE_DESC[selectedDecade]}</p>
        </div>

        {genresInDecade.length === 0 ? (
          <div className="text-gray-500 text-center py-16">
            No genres in the dataset emerged during the {selectedDecade}.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byFamily).map(([family, fGenres]) => {
              const col = getFamilyColor(family);
              return (
                <div key={family}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: col.primary }} />
                    <h3 className="font-semibold text-white capitalize">{family}</h3>
                    <span className="text-gray-600 text-sm">({fGenres.length})</span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fGenres.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => onSelectGenre(g)}
                        className="text-left p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-100 group"
                        style={{
                          background: `${col.glow}10`,
                          borderColor: `${col.primary}30`,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${col.primary}70`;
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${col.glow}20`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${col.primary}30`;
                          (e.currentTarget as HTMLElement).style.boxShadow = '';
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-white text-sm">{g.name}</h4>
                          <div className="flex gap-1 flex-shrink-0">
                            {g.beginnerFriendly && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                                beginner
                              </span>
                            )}
                            {g.deepCut && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                deep cut
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{g.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {g.bpmRange && (
                            <span className="text-[10px] text-gray-500">{g.bpmRange}</span>
                          )}
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">{g.originCities[0]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
