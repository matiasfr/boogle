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
/** The parts of a placement and its prefab's colliders that coverNear reads. */
type CoverPlacement = { prefab: string; pos: readonly number[]; rot?: readonly number[]; scale?: readonly number[] };
type CoverCollider =
  | { shape: 'box'; at: readonly number[]; half: readonly number[] }
  | { shape: 'trimesh'; at: readonly number[]; vertices: readonly number[] }
  | { shape: string; at: readonly number[] };
/** An area's mount distance that covers every solid point of `placements` (each box collider's corners and each
 * trimesh's vertices, across: x and z) from `centre` with ARRIVAL to spare, rounded up to 10 m and never under
 * MOUNT_NEAR. `prefabs`: the compiled records the placements name. */
export function coverNear(
  placements: readonly CoverPlacement[],
  prefabs: Readonly<Record<string, { colliders: readonly CoverCollider[] }>>,
  centre: { x: number; z: number },
) {
  let far = 0;
  const reach = (x: number, z: number) => (far = Math.max(far, Math.hypot(x - centre.x, z - centre.z)));
  for (const p of placements) {
    const yaw = p.rot?.[0] ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      [sx = 1, , sz = 1] = p.scale ?? [];
    // A local (x, z) of the placement in the world, as its yaw turns it.
    const at = (x: number, z: number) =>
      reach(p.pos[0]! + c * x * sx + s * z * sz, p.pos[2]! - s * x * sx + c * z * sz);
    for (const k of prefabs[p.prefab]?.colliders ?? []) {
      if (k.shape === 'box' && 'half' in k)
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) at(k.at[0]! + dx * k.half[0]!, k.at[2]! + dz * k.half[2]!);
      else if (k.shape === 'trimesh' && 'vertices' in k)
        for (let i = 0; i < k.vertices.length; i += 3) at(k.at[0]! + k.vertices[i]!, k.at[2]! + k.vertices[i + 2]!);
    }
  }
  return Math.max(MOUNT_NEAR, Math.ceil((far + ARRIVAL) / 10) * 10);
}
