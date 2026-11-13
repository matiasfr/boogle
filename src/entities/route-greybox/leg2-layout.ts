// Shared leg-2 coordinates and authored placeholder copy. No meshes or colliders are constructed here.
export type XZ = { x: number; z: number };
const PLACEHOLDER = 'Not connected yet';
const stall = (place: string) => [`Stall: ${place} (placeholder)`, PLACEHOLDER] as const;
export const LEG2_TEXT: Readonly<Record<string, readonly string[]>> = {
  'bell.pad-gorge': stall('High Gorge'),
  'bell.pad-ring': stall('Ring Island'),
  'bell.pad-home': stall('Home'),
  'bell.pad-canopy': stall('Canopy Town'),
  'bell.pad-quay': stall('Port Quay'),
  'bell.market': ['Market board (placeholder)'],
  'west.board': ['LINE TO BELL ROCK', 'UNDER CONSTRUCTION'],
};
const westLength = Math.hypot(-0.6155, -0.7881);
export const AREA_CENTRES = {
  gorge: { x: -103, z: -1988 },
  bell: { x: -50, z: -850 },
  west: { x: 801 + (-0.6155 / westLength) * 20, z: 10 + (-0.7881 / westLength) * 20 },
} as const;
export const PAD_SIZE = { along: 6, across: 4 };
