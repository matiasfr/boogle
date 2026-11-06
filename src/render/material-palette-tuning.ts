// sRGB anchor swatches, not replacements for texture/grain/vertex variation.
// Candidate 0 retains the authored pigment exactly. No owner palette selection yet.
export const PALETTE_NAMES = ['Current', 'Fresh', 'Cool', 'Soft'] as const;
export const MATERIAL_PALETTES = {
  grass: ['#6c9a42', '#589351', '#43895b', '#71965f'],
  sand: ['#e0b271', '#ddc08c', '#d4c5a2', '#e5ce9f'],
  timber: ['#a57336', '#9b784d', '#8d7958', '#9f8663'],
  stone: ['#d0a872', '#c3b08c', '#b5b2a4', '#cfc2a6'],
  walls: ['#fff8e9', '#f5f3eb', '#e7eef1', '#f1eee4'],
  roofs: ['#e5bb70', '#ccb789', '#adb4ac', '#c8bb9b'],
} as const;
export type MaterialFamily = keyof typeof MATERIAL_PALETTES;
export const MATERIAL_FAMILIES = Object.keys(MATERIAL_PALETTES) as MaterialFamily[];
export const MATERIAL_PALETTE_SPECS = MATERIAL_FAMILIES.map((family) => ({
  id: `material.${family}`,
  type: 'number' as const,
  scope: 'local' as const,
  default: 0,
  min: 0,
  max: 3,
  integer: true,
  units: '0 Current, 1 Fresh, 2 Cool, 3 Soft',
  at: 'live pigment uniform / owned instance-colour upload',
  owner: 'src/render/material-palette.ts',
  meaning: `${family}: linear RGB ratios from sRGB anchors ${MATERIAL_PALETTES[family].join(' / ')}; preserve surface detail and response.`,
}));
