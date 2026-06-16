import type { FamilyColorMap } from '../types';

// Refined palette: muted, harmonious tones that stay distinct on near-black
// without the "neon overload" of saturated primaries. Each family has a
// primary (node fill / accent), a deep glow (backgrounds, dimmed states),
// and a light text shade for labels on colored chips.
export const FAMILY_COLORS: FamilyColorMap = {
  house:      { primary: '#8b80e0', glow: '#3f3580', text: '#c9c3f2' },
  techno:     { primary: '#40b89a', glow: '#1c6452', text: '#9fe0cd' },
  trance:     { primary: '#e0945a', glow: '#9e5526', text: '#f2c79e' },
  dnb:        { primary: '#5b9be0', glow: '#2a5690', text: '#abccf2' },
  bass:       { primary: '#d4ad4a', glow: '#856518', text: '#ecd699' },
  ambient:    { primary: '#d173ad', glow: '#883a68', text: '#edb6d6' },
  electro:    { primary: '#83b052', glow: '#4c6824', text: '#c2d99e' },
  hardcore:   { primary: '#db6363', glow: '#982a2a', text: '#f2acac' },
  disco:      { primary: '#c479cc', glow: '#7a3a86', text: '#e3b8e9' },
  industrial: { primary: '#8a93a8', glow: '#4a5266', text: '#c3cad8' },
  breaks:     { primary: '#df8a5c', glow: '#9c4d26', text: '#f2c4a8' },
  hiphop:     { primary: '#a3b556', glow: '#5e6a26', text: '#d6e09e' },
};

export const getFamilyColor = (family: string): FamilyColorMap[string] => {
  return FAMILY_COLORS[family] ?? { primary: '#8a93a8', glow: '#4a5266', text: '#c3cad8' };
};

export const accentText = (primary: string) =>
  `color-mix(in srgb, ${primary} 52%, var(--text-1))`;

export const tintStyle = (primary: string, fill = 16, border = 38) => ({
  background: `color-mix(in srgb, ${primary} ${fill}%, var(--surface-1))`,
  color: accentText(primary),
  border: `1px solid color-mix(in srgb, ${primary} ${border}%, var(--border))`,
});

export const familyTintStyle = (color: FamilyColorMap[string], fill = 16, border = 38) =>
  tintStyle(color.primary, fill, border);
