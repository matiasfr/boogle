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
  // Greybox leg 3 (docs/plans/greybox-leg3.md, "Controls and copy"): beside the Notch barrier at Canopy Town's buffers.
  'canopy.notch': ['LINE TO LANTERN NOTCH', 'LATER'],
};
const westLength = Math.hypot(-0.6155, -0.7881);
export const AREA_CENTRES = {
  gorge: { x: -103, z: -1988 },
  bell: { x: -50, z: -850 },
  west: { x: 801 + (-0.6155 / westLength) * 20, z: 10 + (-0.7881 / westLength) * 20 },
  // Canopy isle's map centre (docs/world/map-prototypes.html, `canopy-isle`): the isle, its islets and Canopy Town.
  canopy: { x: -1060, z: -300 },
} as const;
export { PAD_SIZE } from '../../prefab/greybox-constants.ts';
/** The usual distance an area mounts within (route-greybox/index.ts; freed past it plus FREE_MORE). */
export const MOUNT_NEAR = 400,
  FREE_MORE = 150,
  /** How far out of an area's farthest box its residency reaches, so a swimmer or a glider coming in finds every
   * collider already there (a mount takes a moment: its pipeline compiles off the frame). */
  ARRIVAL = 40;
/** An area's mount distance that covers the boxes among `placements` (each scaled one's centre and half diagonal) from
 * `centre` with ARRIVAL to spare, rounded up to 10 m and never under MOUNT_NEAR. */
export function coverNear(
  placements: readonly { pos: readonly number[]; scale?: readonly number[] }[],
  centre: { x: number; z: number },
) {
  let far = 0;
  for (const p of placements) {
    if (!p.scale) continue;
    const [w = 1, , d = 1] = p.scale;
    far = Math.max(far, Math.hypot(p.pos[0]! - centre.x, p.pos[2]! - centre.z) + Math.hypot(w, d) / 2);
  }
  return Math.max(MOUNT_NEAR, Math.ceil((far + ARRIVAL) / 10) * 10);
}
