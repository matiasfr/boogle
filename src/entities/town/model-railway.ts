// The driver's train set (docs/brainstorms/first-house-resident.md, step 4): in the first bought house's front room, a
// hobbyist's layout of the room's own railway on a green baseboard. Track only: the stretches of line 1 and line 2
// that are laid, on their real curves, fitted to the two lines' whole extent so the bare board shows room to grow; a
// halt board at each laid halt; and the real trains, from the same 2 Hz sample as the museum's table. It reads the
// one shared reader both tables draw (./town-read.ts `laidStretches`), so it gains a stretch when the room lays one.
// The newest stretch's rails stay bright for a while after its end tick, on the shared clock, so a friend who comes
// in late sees the same paint. The museum keeps its miniature of the whole place (./museum.ts); this is not a map.
// Local presentation over the Server-replicated railway mirror. Its solid is the `town.driver-table` record, there
// while the room stands; anyone standing where it appears is moved clear first (site-clearance.ts, as sites do).
import * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { HALTS, LINKS, ORIGIN, lineAt, type Line, type LinePoint } from '../../place/layout.ts';
import { outOf } from '../../place/sites.ts';
import { siteExit } from '../../place/site-clearance.ts';
import { H } from '../../place/terrain.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { roomMesh, roomToWorld, type Part, type Room } from './rooms.ts';
import { laidStretches, type LaidStretch, type TownLook } from './town-read.ts';

/** Room-space box: centre, half extents, top (the record's collider). */
export type TableBox = { x: number; z: number; hx: number; hz: number; top: number };
/** World-local (line coordinates: x less `ORIGIN.x`) to the table top in room space. */
export type TrainSetFit = { k: number; c: number; s: number; u: number; v: number; x: number; z: number };
/** What a train-set bit looks like: track, halts and trains, in metres on the table. */
export type TrainSetLook = {
  step: number; // m of real line per track bit
  ballast: [w: number, h: number, color: string];
  rail: [w: number, h: number, color: string];
  board: [w: number, h: number, post: number, color: string, postColor: string, out: number];
  train: [w: number, h: number, l: number, color: string];
  /** Ticks the newest stretch stays bright after its end tick (10 ticks a second). */
  freshTicks: number;
};
type Bit = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  yaw: number,
  color: string,
  glow: number,
) => void;

/** The table's box in room space, from its record's collider. */
export function tableBox(solid: { at: readonly number[]; half: readonly number[] }): TableBox {
  return {
    x: solid.at[0]!,
    z: solid.at[2]!,
    hx: solid.half[0]!,
    hz: solid.half[2]!,
    top: solid.at[1]! + solid.half[1]!,
  };
}

/** The scale and centre that fit every line's whole length on the table top, `margin` in from its edges, turned into
 * room axes by the room's `yaw` (so the model lies as the land does). */
export function fitTrainSet(lines: readonly Line[], yaw: number, box: TableBox, margin: number): TrainSetFit {
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  let u0 = Infinity,
    u1 = -Infinity,
    v0 = Infinity,
    v1 = -Infinity;
  for (const line of lines)
    for (let k = 0; k < line.xs.length; k++) {
      const x = line.xs[k]!,
        z = line.zs[k]!;
      const u = x * c - z * s,
        v = x * s + z * c;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
  const k = Math.min(((box.hx - margin) * 2) / (u1 - u0), ((box.hz - margin) * 2) / (v1 - v0));
  return { k, c, s, u: (u0 + u1) / 2, v: (v0 + v1) / 2, x: box.x, z: box.z };
}

/** Every bit of the table's railway, through `bit`; returns how many, and how bright the newest stretch still is
 * (0 to 1). Each laid stretch as ballast and a rail every
 * `look.step` metres, the newest still bright until `look.freshTicks` after its end tick; a board beside each halt
 * whose middle is laid; each train on its track. Pure over its arguments and `lineAt` (the unit test runs it). */
export function planTrainSet(
  stretches: readonly LaidStretch[],
  lines: readonly Line[],
  halts: readonly { line: 0 | 1; s0: number; s1: number; lat: number }[],
  trains: readonly { x: number; z: number }[],
  fit: TrainSetFit,
  top: number,
  tick: number,
  look: TrainSetLook,
  bit: Bit,
) {
  let n = 0;
  const tx = (x: number, z: number) => fit.x + (x * fit.c - z * fit.s - fit.u) * fit.k;
  const tz = (x: number, z: number) => fit.z + (x * fit.s + z * fit.c - fit.v) * fit.k;
  /** A heading on the land (a direction) as a yaw on the table. */
  const yawOf = (ux: number, uz: number) => Math.atan2(ux * fit.c - uz * fit.s, ux * fit.s + uz * fit.c);
  const pt: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const spot = { x: 0, z: 0, yaw: 0 };
  /** Where metre `m` of a line lies on the table, and which way it runs there (one shared result, read before the
   * next call). */
  const along = (line: Line, m: number) => {
    lineAt(line, m, pt);
    spot.x = tx(pt.x, pt.z);
    spot.z = tz(pt.x, pt.z);
    spot.yaw = yawOf(pt.ux, pt.uz);
    return spot;
  };
  let newest = -1;
  for (const q of stretches) newest = Math.max(newest, q.end);
  const age = tick - newest;
  const fresh = newest >= 0 && age >= 0 && age < look.freshTicks ? 1 - age / look.freshTicks : 0;
  const [bw, bh, bc] = look.ballast,
    [rw, rh, rc] = look.rail;
  for (const q of stretches) {
    const line = lines[q.line]!;
    const glow = q.end === newest ? fresh : 0;
    for (let m = Math.max(0, q.lo); m < Math.min(line.len, q.hi); m += look.step) {
      const p = along(line, m);
      const l = look.step * fit.k * 1.1;
      bit(p.x, top + bh / 2, p.z, bw, bh, l, p.yaw, bc, 0);
      bit(p.x, top + bh + rh / 2, p.z, rw, rh, l, p.yaw, rc, glow);
      n += 2;
    }
  }
  const [hw, hh, post, hc, pc, out] = look.board;
  for (const h of halts) {
    const mid = (h.s0 + h.s1) / 2;
    if (!stretches.some((q) => q.line === h.line && q.lo <= mid && mid <= q.hi)) continue;
    const p = along(lines[h.line]!, mid);
    // Beside the track on the halt's side: lat is metres left (+) of the line's +s direction.
    const side = Math.sign(h.lat) || 1;
    const x = p.x - Math.cos(p.yaw) * out * side,
      z = p.z + Math.sin(p.yaw) * out * side;
    bit(x, top + post / 2, z, 0.006, post, 0.006, 0, pc, 0);
    bit(x, top + post + hh / 2, z, hw, hh, 0.006, p.yaw + Math.PI / 2, hc, 0);
    n += 2;
  }
  const [trw, trh, trl, trc] = look.train;
  for (const t of trains) {
    // Its heading is its track's: the nearest point of either line.
    let best = Infinity,
      on: Line | null = null,
      at = 0;
    // (A point index; its heading is the span on from it.)
    for (const line of lines)
      for (let k = 0; k < line.xs.length; k++) {
        const d = (line.xs[k]! - t.x) ** 2 + (line.zs[k]! - t.z) ** 2;
        if (d < best) {
          best = d;
          on = line;
          at = k;
        }
      }
    if (!on) continue;
    const k = Math.min(at, on.xs.length - 2);
    const yaw = yawOf(on.xs[k + 1]! - on.xs[k]!, on.zs[k + 1]! - on.zs[k]!);
    bit(tx(t.x, t.z), top + bh + rh + trh / 2, tz(t.x, t.z), trw, trh, trl, yaw, trc, 0);
    n++;
  }
  return { n, fresh };
}

const LOOK: TrainSetLook = {
  step: 4,
  ballast: [0.045, 0.008, '#7a6a55'],
  rail: [0.018, 0.005, '#2e2925'],
  board: [0.06, 0.03, 0.05, '#f2ead6', '#4a3a2c', 0.045],
  train: [0.036, 0.04, 0.11, '#d8392b'],
  freshTicks: 1200,
};
const FRESH = new THREE.Color('#ffd36b');
const MARGIN = 0.08;
const REDRAW = 0.1; // s, while the room's interior draws: as the museum's table
const bitsMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 });

/** The train set in `room` (the first bought house), on `owner`. `env.look` is the town's read of the shared
 * railway; `env.trains` the sampled trains' engines, in world metres. Update every frame; it redraws at 10 Hz while
 * the interior draws. */
export function createModelRailway(
  owner: OwnedView,
  room: Room,
  env: { look(): TownLook | null; trains(): Iterable<{ x: number; z: number }> },
) {
  const def = definitions['town.driver-table'];
  const solid = def?.colliders[0];
  if (!solid || solid.shape !== 'box') throw new Error('model-railway: the table record has no box');
  const box = tableBox(solid);
  const lines = LINKS.map((l) => l.line);
  const fit = fitTrainSet(lines, room.yaw, box, MARGIN);
  const fixtureOwner = createOwnedView();
  room.near.add(fixtureOwner.root);
  owner.cleanup(fixtureOwner.dispose);
  const table = instantiate(
    'town.driver-table',
    { id: 'plot3-driver-table', prefab: 'town.driver-table', pos: [0, 0, 0] },
    { owner: fixtureOwner },
  );
  // Moves you clear before the table's solid comes in: out of the table, or of the corner it fills to the walls and a
  // little past them, so the way out is into the room (or well outside), never into a wall.
  const zone = { x0: box.x - box.hx, x1: room.w / 2 + 1.5, z0: -room.d / 2 - 1.5, z1: box.z + box.hz };
  const zx = (zone.x0 + zone.x1) / 2,
    zz = (zone.z0 + zone.z1) / 2;
  const zoneAt = roomToWorld(room, zx, 0, zz, new THREE.Vector3());
  const foot = {
    x: zoneAt.x,
    z: zoneAt.z,
    c: Math.cos(room.yaw),
    s: Math.sin(room.yaw),
    hw: (zone.x1 - zone.x0) / 2,
    hd: (zone.z1 - zone.z0) / 2,
  };
  const solids = [{ dx: box.x - zx, dy: solid.at[1], dz: box.z - zz, hx: box.hx, hy: solid.half[1], hz: box.hz }];
  const clear = () => {
    const b = me.body;
    if (!b) return;
    const exit = siteExit(b.position, foot, room.y, solids, outOf, undefined, 0.02);
    if (!exit) return;
    // On the floor if it's in the room, else on the ground.
    const y = Math.max(H(exit.x, exit.z), room.y) + PLAYER_R + 0.2;
    b.position.set(exit.x, y, exit.z);
    b.interpolatedPosition.set(exit.x, y, exit.z);
    b.velocity.set(0, 0, 0);
  };
  room.furnishings.push({
    setEnabled(on: boolean) {
      if (on) clear();
      table.setEnabled(on);
    },
  });
  // The baseboard: a green top in a wooden frame on four legs, one merged mesh in the rooms' material.
  const { x, z, hx, hz, top } = box;
  const wood = '#8a5a34';
  const parts: Part[] = [
    ['b', x, top - 0.02, z, hx * 2, 0.04, hz * 2, '#5f9a48'],
    ...[-1, 1].flatMap((side): Part[] => [
      ['b', x, top - 0.05, z + side * (hz - 0.02), hx * 2, 0.1, 0.04, wood],
      ['b', x + side * (hx - 0.02), top - 0.05, z, 0.04, 0.1, hz * 2, wood],
    ]),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz): Part => [
        'b',
        x + sx * (hx - 0.08),
        (top - 0.1) / 2,
        z + sz * (hz - 0.08),
        0.07,
        top - 0.1,
        0.07,
        '#7f5630',
      ]),
    ),
  ];
  const board = roomMesh(parts);
  board.name = 'town:train-set';
  room.near.add(board);
  owner.cleanup(() => board.geometry.dispose());
  // Every line's whole length laid, every halt and a few trains: the most it can ever draw.
  let most = HALTS.length * 2 + 16;
  for (const line of lines) most += 2 * (Math.ceil(line.len / LOOK.step) + 2);
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bitsMat, most);
  bits.name = 'town:train-set-bits';
  bits.frustumCulled = false;
  bits.receiveShadow = true;
  // Its colours exist before anything compiles it (rooms.ts `warm`), or the pipeline is built without them.
  bits.setColorAt(0, new THREE.Color(LOOK.rail[2]));
  bits.count = 0;
  room.near.add(bits);
  owner.cleanup(() => {
    bits.geometry.dispose();
    bits.dispose();
  });
  const m_ = new THREE.Matrix4(),
    q_ = new THREE.Quaternion(),
    p_ = new THREE.Vector3(),
    s_ = new THREE.Vector3(),
    c_ = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);
  let n_ = 0;
  const bit: Bit = (bx, by, bz, sx, sy, sz, yaw, color, glow) => {
    if (n_ >= most) return;
    q_.setFromAxisAngle(UP, yaw);
    bits.setMatrixAt(n_, m_.compose(p_.set(bx, by, bz), q_, s_.set(sx, sy, sz)));
    bits.setColorAt(n_, c_.set(color).lerp(FRESH, glow));
    n_++;
  };
  let drawn: LaidStretch[] = [],
    fresh = 0;
  const trainsAt: { x: number; z: number }[] = [];
  function draw() {
    const look = env.look();
    drawn = [...laidStretches(look)];
    trainsAt.length = 0;
    for (const t of env.trains()) trainsAt.push({ x: t.x - ORIGIN.x, z: t.z });
    n_ = 0;
    fresh = planTrainSet(drawn, lines, HALTS, trainsAt, fit, top, look?.tick ?? 0, LOOK, bit).fresh;
    bits.count = n_;
    bits.instanceMatrix.needsUpdate = true;
    if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
  }
  let wait = 0;
  return {
    update(dt: number) {
      if (!room.ready || !room.near.visible || (wait -= dt) > 0) return;
      wait = REDRAW;
      draw();
    },
    /** For the evals: what the table drew last, and its scale (metres of table per metre of line). */
    inspect: () => ({
      bits: bits.count,
      stretches: drawn.map(({ line, lo, hi }) => ({ line, lo, hi })),
      trains: trainsAt.length,
      fresh: fresh > 0,
      scale: fit.k,
    }),
  };
}
export type ModelRailway = ReturnType<typeof createModelRailway>;
