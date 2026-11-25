// No new way up (docs/plans/cliff-kit-everywhere.md, step 0's audit): Place's own flood does not read prop solids, so an
// area's kit pieces get their own reach check, for the most capable player. Over a 0.5 m grid round the area, the ground
// the game builds stands with every piece's solids on it (each column's height is the highest solid over it). Somewhere
// to stand is bare ground with a walkable quad beside it (./flood.ts `standable`), or, over a piece, a box's top face
// that is the column's highest solid and walkable (WALKABLE_NY): a slab's steep front, binned onto the grid, is no
// ledge. From every tread cell in the window, every cell of deep water, and the roof of a train anywhere along every
// drawn track (the highest car's), a player moves:
// - a step to a neighbouring cell, as the controller allows (./flood.ts's rules: a fall anywhere; up, ground at both
//   ends and a step within the walkable slope or one jump; out of deep water, a swimmer's hop);
// - from somewhere to stand, a double jump to any standable cell within TWO_REACH m and TWO_JUMPS m up (falling, one
//   jump: JUMP_REACH and ONE_JUMP);
// - a glide after those jumps to any cell within GLIDE(drop) m (./mover.ts, the abilities check's own numbers).
// Jumps and glides ignore what is in the way, so the check errs strict. Twice: freely, and with the kit as no climbing
// aid: standing on a piece, a player moves as if from the height of the ground (or roof) they got onto it from, never
// higher than the piece itself; falling onto a piece, as from the piece. Each search costs a route its length plus its
// start's height times SHORTCUT, so a cell reached from lower ground is reached sooner (every start in the window is
// one: the plateau's own path must not hide a staircase up to it from the climb). A standable cell the free search
// reaches is a new way up when the second does not reach it, or reaches it only SHORTCUT m or more later (the kit is a
// short cut, or lets a player up from lower ground: a metre lower counts as SHORTCUT m). Hopping onto a boulder passes; a staircase, a ramp, a perch that
// launches a longer glide, or steps off a train's roof fail. Starting only from the window's treads is strict too.
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { solidBoxes, solidSamples } from '../prefab/cliff-kit.ts';
import { WALKABLE_NY } from '../../src/constants.ts';
import { LOCO, RIDER_CAR, TRAILER, WAGON_CAR } from '../../src/entities/railway/cars.ts';
import { standable } from './flood.ts';
import { GLIDE, JUMP_REACH, MOVER, ONE_JUMP, TWO_JUMPS, TWO_REACH } from './mover.ts';
import { tracks } from './rail-network.ts';

/** Grid spacing, m; how far past the pieces' solids the window reaches; the shortest detour the kit may not cut, m; the
 * spacing of glide landings on open ground (every piece's standable cell is one too), cells; a roof every ROOF m. */
const CELL = 0.5,
  MARGIN = 16,
  SHORTCUT = 10,
  LANDING = 4,
  ROOF = 2,
  LIFT = 0.1;
/** The highest roof a player rides, over the rail's top. */
const ROOF_TOP = Math.max(LOCO.top, RIDER_CAR.top, TRAILER.top, WAGON_CAR.top);

export type Reach = { cells: number; fresh: { x: number; z: number; y: number; saved: number | null }[] };

/** The cells only the kit reaches, over a window round `placements`' solids. */
export function kitReach(placements: readonly Placement[]): Reach {
  if (!placements.length) return { cells: 0, fresh: [] };
  const samples = placements.map((p) => [...solidSamples(p, CELL / 2)]);
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const list of samples)
    for (const [x, , z] of list) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  x0 -= MARGIN;
  z0 -= MARGIN;
  const n = Math.ceil(Math.max(x1 + MARGIN - x0, z1 + MARGIN - z0) / CELL) + 1;
  // Node (i, j) is Place-local (x0 + i CELL, z0 + j CELL), at i * n + j.
  const bare = new Float32Array(n * n),
    kit = new Float32Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = x0 + i * CELL,
        z = z0 + j * CELL,
        k = i * n + j;
      bare[k] = kit[k] = H(x + ORIGIN.x, z);
    }
  for (const list of samples)
    for (const [x, y, z] of list) {
      const i = Math.round((x - x0) / CELL),
        j = Math.round((z - z0) / CELL);
      if (i >= 0 && j >= 0 && i < n && j < n) kit[i * n + j] = Math.max(kit[i * n + j]!, y);
    }
  // The walkable top faces' heights, sampled as the volumes are.
  const tops = new Float32Array(n * n).fill(-Infinity);
  for (const p of placements)
    for (const box of solidBoxes(p)) {
      const o = box(0, 0, 0),
        up = box(0, 1, 0);
      const ny = (up[1] - o[1]) / Math.hypot(up[0] - o[0], up[1] - o[1], up[2] - o[2]);
      if (ny < WALKABLE_NY) continue;
      const su = Math.max(1, Math.ceil((4 * box.half[0]) / CELL)),
        sw = Math.max(1, Math.ceil((4 * box.half[2]) / CELL));
      for (let a = 0; a <= su; a++)
        for (let b = 0; b <= sw; b++) {
          const [x, y, z] = box((2 * a) / su - 1, 1, (2 * b) / sw - 1);
          const i = Math.round((x - x0) / CELL),
            j = Math.round((z - z0) / CELL);
          if (i >= 0 && j >= 0 && i < n && j < n) tops[i * n + j] = Math.max(tops[i * n + j]!, y);
        }
    }
  const piece = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) piece[k] = kit[k]! > bare[k]! + 0.01 ? 1 : 0;
  // Starts: tread and deep water, where no piece stands over them (a swimmer under a piece is not on it).
  const starts: number[] = [];
  for (let k = 0; k < n * n; k++) {
    if (piece[k]) continue;
    const i = Math.floor(k / n);
    if (bare[k]! < -MOVER.wade || pathAt(x0 + i * CELL, z0 + (k - i * n) * CELL).edge <= 0) starts.push(k);
  }
  const stand = standable({ n, cell: CELL, h: kit }, MOVER).map((g, k) =>
    piece[k] ? (tops[k]! >= kit[k]! - 0.05 ? 1 : 0) : g,
  );
  // Roofs: a train's highest roof every ROOF m along every drawn track inside the window.
  const roofs: { x: number; z: number; y: number }[] = [];
  for (const t of tracks()) {
    if (!t.enforce && t.status !== 'v27') continue;
    let last = -Infinity;
    for (const q of t.pts) {
      const x = q.x - ORIGIN.x,
        z = q.z - ORIGIN.z;
      if (x < x0 || z < z0 || x > x0 + (n - 1) * CELL || z > z0 + (n - 1) * CELL || q.s - last < ROOF) continue;
      last = q.s;
      roofs.push({ x, z, y: q.y + ROOF_TOP });
    }
  }
  const world = { n, x0, z0, bare, kit, piece, stand, starts, roofs };
  const free = travel(world, true),
    unaided = travel(world, false);
  const fresh: Reach['fresh'] = [];
  for (let k = 0; k < n * n; k++) {
    if (free[k] === Infinity || !stand[k]) continue;
    const saved = unaided[k] === Infinity ? null : unaided[k]! - free[k]!;
    if (saved === null || saved >= SHORTCUT) {
      const i = Math.floor(k / n);
      fresh.push({ x: x0 + i * CELL, z: z0 + (k - i * n) * CELL, y: kit[k]!, saved });
    }
  }
  return { cells: n * n, fresh };
}

type World = {
  n: number;
  x0: number;
  z0: number;
  bare: Float32Array;
  kit: Float32Array;
  piece: Uint8Array;
  stand: Uint8Array;
  starts: number[];
  roofs: { x: number; z: number; y: number }[];
};

/** The shortest way, m across the ground, from the starts and roofs to every cell (Infinity: none). `aided`: the kit is
 * ground like any other. Otherwise a state on a piece carries `lift`, the height a player really has there. Got up onto
 * it from lower ground (or a roof): standing, as on the ground under the piece or where they came from, whichever is
 * lower (lift, rounded down to LIFT), so a piece lends neither height nor a step out over a drop. Came down onto it:
 * falling past the piece's top, as without the piece (lift is the top; one jump left, no grip to climb). A
 * piece cell keeps every state that no other of the same kind beats both nearer and higher. */
function travel({ n, x0, z0, bare, kit, piece, stand, starts, roofs }: World, aided: boolean) {
  const { walkSlope, jumpHeight, wade, swimHop } = MOVER;
  const at = kit.map((h) => Math.max(h, -wade)), // what you stand or float at
    under = bare.map((h) => Math.max(h, -wade)); // and without the kit
  const level = (k: number) => at[k]!;
  const deep = (k: number) => kit[k]! < -wade;
  const dist = new Float64Array(n * n).fill(Infinity);
  /** Each piece cell's kept states, [distance, lift] (only without the kit's aid). */
  const kept = new Map<number, [number, number][]>();
  const heap = new Heap();
  const push = (k: number, d: number, from: number) => {
    const lift = !aided && piece[k] && from < level(k) ? Math.floor(Math.min(from, under[k]!) / LIFT) * LIFT : level(k);
    if (!aided && piece[k]) {
      const states = kept.get(k) ?? kept.set(k, []).get(k)!;
      const beats = (a: number, al: number, b: number, bl: number) =>
        a <= b && al >= bl && (al === level(k)) === (bl === level(k));
      for (const [sd, sl] of states) if (beats(sd, sl, d, lift)) return;
      // Keep only the states the new one does not beat.
      let w = 0;
      for (const st of states) if (!beats(d, lift, st[0], st[1])) states[w++] = st;
      states.length = w;
      states.push([d, lift]);
    } else if (d >= dist[k]!) return;
    dist[k] = Math.min(dist[k]!, d);
    heap.push(d, k, lift);
  };
  // Glides land on every LANDING-th cell of open ground and on every standable piece cell, binned BIN cells a side
  // with each bin's lowest landing, so a launch skips the bins no glide from it reaches.
  const BIN = 16,
    bins = Math.ceil(n / BIN);
  const landings: number[][] = Array.from({ length: bins * bins }, () => []);
  const lowest = new Float32Array(bins * bins).fill(Infinity);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      if (!(piece[k] && stand[k]) && (i % LANDING || j % LANDING)) continue;
      const b = Math.floor(i / BIN) * bins + Math.floor(j / BIN);
      landings[b]!.push(k);
      lowest[b] = Math.min(lowest[b]!, level(k));
    }
  // The cells a jump reaches, as offsets with their distance, nearest first.
  const disk: [number, number, number][] = [];
  const reach = Math.ceil(TWO_REACH / CELL);
  for (let di = -reach; di <= reach; di++)
    for (let dj = -reach; dj <= reach; dj++) {
      const c = Math.hypot(di, dj) * CELL;
      if (c <= TWO_REACH && (di || dj)) disk.push([di, dj, c]);
    }
  disk.sort((a, b) => a[2] - b[2]);
  /** Jumps and glides from (x, z), launched at `from` (two jumps if standing, one if falling). */
  const launch = (x: number, z: number, from: number, d: number, standing: boolean) => {
    const rise = standing ? TWO_JUMPS : ONE_JUMP,
      far = standing ? TWO_REACH : JUMP_REACH;
    const ci = Math.round((x - x0) / CELL),
      cj = Math.round((z - z0) / CELL);
    for (const [di, dj, c] of disk) {
      if (c > far) break;
      const i = ci + di,
        j = cj + dj;
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const q = i * n + j;
      if (stand[q] && at[q]! - from <= rise) push(q, d + c, from);
    }
    const top = from + rise;
    for (let bi = 0; bi < bins; bi++)
      for (let bj = 0; bj < bins; bj++) {
        const b = bi * bins + bj,
          most = GLIDE(top - lowest[b]!);
        if (!most) continue;
        // The nearest point of the bin's square.
        const nx = Math.max(x0 + bi * BIN * CELL, Math.min(x, x0 + ((bi + 1) * BIN - 1) * CELL)),
          nz = Math.max(z0 + bj * BIN * CELL, Math.min(z, z0 + ((bj + 1) * BIN - 1) * CELL));
        if (Math.hypot(nx - x, nz - z) > most) continue;
        for (const q of landings[b]!) {
          const i = Math.floor(q / n),
            c = Math.hypot(x0 + i * CELL - x, z0 + (q - i * n) * CELL - z);
          if (level(q) < top && c <= GLIDE(top - level(q))) push(q, d + c, from);
        }
      }
  };
  // A start costs its height: starting a metre lower is worth SHORTCUT m of walking, so a way up from lower ground shows.
  for (const k of starts) push(k, level(k) * SHORTCUT, level(k));
  for (const r of roofs) launch(r.x, r.z, r.y, r.y * SHORTCUT, true);
  while (heap.size) {
    const [d, k, lift] = heap.pop();
    if (aided || !piece[k] ? d > dist[k]! : !kept.get(k)!.some(([sd, sl]) => sd === d && sl === lift)) continue;
    const i = Math.floor(k / n),
      j = k - i * n;
    // Standing here: on ground, or (without the kit's aid) on a piece they got up onto; falling past one, not.
    const standing = stand[k] === 1 && (aided || !piece[k] || lift < level(k));
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        const a = i + di,
          b = j + dj;
        if ((!di && !dj) || a < 0 || b < 0 || a >= n || b >= n) continue;
        const q = a * n + b,
          c = di && dj ? CELL * Math.SQRT2 : CELL,
          rise = level(q) - lift;
        const ok =
          rise <= 0 ||
          (deep(k) ? rise <= swimHop : standing && stand[q] && (rise <= jumpHeight || rise <= walkSlope * c));
        if (ok) push(q, d + c, lift);
      }
    if (!deep(k)) launch(x0 + i * CELL, z0 + j * CELL, lift, d, standing);
  }
  return dist;
}

/** A binary min-heap of [distance, cell, lift]. */
class Heap {
  private d: number[] = [];
  private k: number[] = [];
  private l: number[] = [];
  get size() {
    return this.d.length;
  }
  push(d: number, k: number, l: number) {
    let i = this.d.length;
    this.d.push(d);
    this.k.push(k);
    this.l.push(l);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.d[p]! <= d) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number, number] {
    const out: [number, number, number] = [this.d[0]!, this.k[0]!, this.l[0]!];
    const last = this.d.length - 1;
    this.swap(0, last);
    this.d.pop();
    this.k.pop();
    this.l.pop();
    for (let i = 0; ;) {
      const a = 2 * i + 1,
        b = a + 1;
      let m = i;
      if (a < this.d.length && this.d[a]! < this.d[m]!) m = a;
      if (b < this.d.length && this.d[b]! < this.d[m]!) m = b;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return out;
  }
  private swap(a: number, b: number) {
    [this.d[a], this.d[b]] = [this.d[b]!, this.d[a]!];
    [this.k[a], this.k[b]] = [this.k[b]!, this.k[a]!];
    [this.l[a], this.l[b]] = [this.l[b]!, this.l[a]!];
  }
}
