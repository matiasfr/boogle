// The committed track's chunk maths, pure: which stretch of the line (200 m for heavy kinds, 400 m for light ones) a piece belongs to, the runs of pieces that
// share one instanced batch, the bounds of what has landed in a batch, and when a batch's shadow is worth its draw.
// No scene, no clock: `lookTrack` (src/place/look-kit.ts) wires these to meshes. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { lodLevel } from '../../render/lod-level.ts';

/** Length of a chunk along the line, in u metres, for the kinds that are heavy to draw (rails of 228 triangles, sleepers
 * and their plates). 200 m, not the 50 m the plan first set: every chunk is a draw, the whole line shows from Far
 * Head, and at 50 m that was +12.6% calls there for 1.2% fewer triangles than 200 m (docs/plans/ecs-migration-railway.md, M9). */
export const TRACK_CHUNK_M = 200;
/** Posts, planks, caps, stringers and braces are 44 triangles each: smaller chunks save no triangles worth a draw. */
export const TRACK_LIGHT_CHUNK_M = 400;
const HEAVY = new Set(['rail', 'sleeper', 'sleeper_steel']);
/** Legs, braces, caps and stringers cast a shadow only in chunks this close to the camera (the sun's shadow camera
 * reaches 36 m, so this is generous: nothing that matters is dropped). */
export const TRACK_SHADOW_M = 120;
/** A chunk that cast stops casting only this much beyond `TRACK_SHADOW_M`, so a camera on the edge does not flicker. */
export const TRACK_SHADOW_HYSTERESIS_M = 20;
/** Kinds whose shadow is gated by distance; the rest (sleepers, rails, planks) keep what they had. */
export const SHADOW_GATED = new Set(['cap', 'stringer', 'leg', 'brace']);

/** Distance (m, from the camera to a chunk's nearest bound) at which a rail, sleeper or tie-plate chunk steps down a level:
 * 0 the kit's full pieces; 1 without the rail's joint plates and bolts and the tie plates' spikes (a bolt is 3 cm, about
 * a pixel at 50 m, 62 degrees and 1080p); 2 plain boxes (a rail's 0.1 m is under a pixel at 120 m). A rail is 228,
 * 44 and 12 triangles. Chunks are 200 m, so one steps whole, by its nearest point. */
export const TRACK_LOD_FROM: readonly number[] = [0, 50, 120];
/** A chunk that stepped down returns to the finer level only this much inside the distance, so a camera on the edge does not flicker. */
export const TRACK_LOD_HYSTERESIS_M = 15;
/** Kinds with a plain far shape. */
export const FAR_KINDS = new Set(['rail', 'sleeper', 'sleeper_steel']);

/** Piece of `kind` at `u`: its chunk. Without a kind, the heavy span. */
export const chunkOf = (u: number, kind = 'rail') => Math.floor(u / (HEAVY.has(kind) ? TRACK_CHUNK_M : TRACK_LIGHT_CHUNK_M));

export type ChunkRun = {
  kind: string;
  chunk: number;
  /** The kind's own index of the run's first piece: the grain seed (today the instance index) of its first instance. */
  from: number;
  count: number;
};
/** Splits the pieces into runs of consecutive same-kind pieces in one chunk. A piece keeps its place in its kind's
 * order, so `from + n` is the instance index the whole-line batch gave it. Returns each piece's run and slot too. */
export function chunkRuns(kinds: readonly string[], chunks: readonly number[]) {
  const runs: ChunkRun[] = [];
  const open = new Map<string, number>();
  const next = new Map<string, number>();
  const of: { run: number; slot: number }[] = [];
  kinds.forEach((kind, k) => {
    const at = next.get(kind) ?? 0;
    next.set(kind, at + 1);
    const chunk = chunks[k] ?? 0;
    let index = open.get(kind);
    if (index === undefined || runs[index]!.chunk !== chunk) {
      index = runs.length;
      open.set(kind, index);
      runs.push({ kind, chunk, from: at, count: 0 });
    }
    const run = runs[index]!;
    of.push({ run: index, slot: at - run.from });
    run.count++;
  });
  return { runs, of };
}

const corner = new THREE.Vector3(),
  piece = new THREE.Box3();
/** Grows `box` over the unit box (centred in x and z, standing on y 0..1) placed by `m`, plus `pad` metres. */
export function growBounds(box: THREE.Box3, m: THREE.Matrix4, pad = 0.3) {
  piece.makeEmpty();
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? 0.5 : -0.5, i & 2 ? 1 : 0, i & 4 ? 0.5 : -0.5).applyMatrix4(m);
    piece.expandByPoint(corner);
  }
  return box.union(piece.expandByScalar(pad));
}
/** The matrix that hides a piece (`makeScale(0, 0, 0)`): it has no extent, so it adds nothing to a chunk's bounds. */
export const isHidden = (m: THREE.Matrix4) => {
  const e = m.elements;
  return !(e[0] || e[1] || e[2] || e[4] || e[5] || e[6] || e[8] || e[9] || e[10]);
};
/** The level (`TRACK_LOD_FROM`) a chunk draws at `distance` m from the camera, given the one it had. */
export const trackLevel = (distance: number, was: number) =>
  lodLevel(TRACK_LOD_FROM, distance, was, TRACK_LOD_HYSTERESIS_M);
/** Whether a chunk `distance` m from the camera casts, given whether it did last frame. */
export const castsShadow = (distance: number, was: boolean) =>
  distance < TRACK_SHADOW_M + (was ? TRACK_SHADOW_HYSTERESIS_M : 0);
