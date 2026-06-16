import type { FamilyColorMap } from '../types';

export const FAMILY_COLORS: FamilyColorMap = {
  house:     { primary: '#a78bfa', glow: '#7c3aed', text: '#ddd6fe' },
  techno:    { primary: '#34d399', glow: '#059669', text: '#a7f3d0' },
  trance:    { primary: '#f97316', glow: '#c2410c', text: '#fed7aa' },
  dnb:       { primary: '#60a5fa', glow: '#1d4ed8', text: '#bfdbfe' },
  bass:      { primary: '#fbbf24', glow: '#b45309', text: '#fde68a' },
  ambient:   { primary: '#f472b6', glow: '#be185d', text: '#fbcfe8' },
  electro:   { primary: '#4ade80', glow: '#15803d', text: '#bbf7d0' },
  hardcore:  { primary: '#f87171', glow: '#b91c1c', text: '#fecaca' },
  disco:     { primary: '#e879f9', glow: '#a21caf', text: '#f5d0fe' },
  industrial:{ primary: '#94a3b8', glow: '#475569', text: '#e2e8f0' },
  breaks:    { primary: '#fb923c', glow: '#c2410c', text: '#fed7aa' },
  hiphop:    { primary: '#a3e635', glow: '#4d7c0f', text: '#d9f99d' },
};

export const getFamilyColor = (family: string): FamilyColorMap[string] => {
  return FAMILY_COLORS[family] ?? { primary: '#94a3b8', glow: '#475569', text: '#e2e8f0' };
};
