// No new way up (docs/plans/cliff-kit-everywhere.md, step 0's audit): Place's own flood does not read prop solids, so an
// area's kit pieces get their own reach check, for the most capable player. Over a 0.5 m grid round the area, the ground
// the game builds stands with every piece's solids on it (each column's height is the highest solid over it). Somewhere
// to stand is bare ground with a walkable quad beside it (./flood.ts `standable`), or, over a piece, a box's top face
// that is the column's highest solid and walkable (WALKABLE_NY): a slab's steep front, binned onto the grid, is no
// ledge. From every tread cell in the window, every cell of deep water not under a piece, and the highest top aboard a
// train (./rail-network.ts TRAIN_TOP, the cab roof) every ROOF m along every drawn track, a player moves:
// - a step to a neighbouring cell, as the controller allows (./flood.ts `steps`);
// - from somewhere to stand, a double jump to any standable cell within TWO_REACH m and TWO_JUMPS m up (falling, one
//   jump: JUMP_REACH and ONE_JUMP);
// - a glide after those jumps to any cell within GLIDE(drop) m (./abilities.ts, the abilities check's own numbers).
// Jumps and glides ignore what is in the way, so the check errs strict. Twice: freely, and with the kit as no climbing
// aid: standing on a piece counts as standing on the ground under it or where the player came from, whichever is
// lower, so a piece lends neither height nor a step out over a drop; falling onto one counts as falling past it. Each
// search costs a route its length plus its start's height times SHORTCUT, so a cell reached from lower ground is
// reached sooner (every start in the window is one: the plateau's own path must not hide a staircase up to it from the
// climb). A standable cell the free search reaches is a new way up when the second does not reach it, or reaches it only
// SHORTCUT m or more later (a short cut, or a way up from lower ground: a metre lower counts as SHORTCUT m). Hopping
// onto a boulder passes; a staircase, a ramp, a perch, or steps off a train's roof fail. Starting only from the
// window's treads and water is strict too.
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { solidBoxes, solidSamples } from '../prefab/cliff-kit.ts';
import { WALKABLE_NY } from '../../src/constants.ts';
import { standable, steps } from './flood.ts';
import { MOVER } from './mover.ts';
import { GLIDE, JUMP_REACH, ONE_JUMP, TWO_JUMPS, TWO_REACH } from './abilities.ts';
import { TRAIN_TOP, alongTrack, drawnTracks } from './rail-network.ts';

/** Grid spacing, m; how far past the pieces' solids the window reaches; the shortest detour the kit may not cut, m; the
 * spacing of glide landings on open ground (every piece's standable cell is one too), cells; a roof every ROOF m; a
 * standing lift on a piece, rounded down to LIFT m (strict), which bounds the states a cell keeps. */
const CELL = 0.5,
  MARGIN = 16,
  SHORTCUT = 10,
  LANDING = 4,
  ROOF = 2,
  LIFT = 0.1;

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
  const at = kit.map((h) => Math.max(h, -MOVER.wade)), // what you stand or float at
    under = bare.map((h) => Math.max(h, -MOVER.wade)); // and without the kit
  const deep = (k: number) => kit[k]! < -MOVER.wade;
  // Roofs: a train's highest top every ROOF m along every drawn track inside the window.
  const inside = (x: number, z: number) => x >= x0 && z >= z0 && x <= x0 + (n - 1) * CELL && z <= z0 + (n - 1) * CELL;
  const roofs = drawnTracks().flatMap((t) =>
    alongTrack(t, ROOF)
      .map((q) => ({ x: q.x - ORIGIN.x, z: q.z - ORIGIN.z, y: q.y + TRAIN_TOP }))
      .filter((q) => inside(q.x, q.z)),
  );
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
      lowest[b] = Math.min(lowest[b]!, at[k]!);
    }
  // The cells a jump reaches, as offsets with their distance, nearest first; the first `oneJump` within JUMP_REACH.
  const reach = Math.ceil(TWO_REACH / CELL);
  const offsets: [number, number, number][] = [];
  for (let di = -reach; di <= reach; di++)
    for (let dj = -reach; dj <= reach; dj++) {
      const c = Math.hypot(di, dj) * CELL;
      if (c <= TWO_REACH && (di || dj)) offsets.push([di, dj, c]);
    }
  offsets.sort((a, b) => a[2] - b[2]);
  const DI = Int32Array.from(offsets, (o) => o[0]),
    DJ = Int32Array.from(offsets, (o) => o[1]),
    DC = Float64Array.from(offsets, (o) => o[2]);
  const oneJump = offsets.findIndex((o) => o[2] > JUMP_REACH);

  /** The shortest way, m across the ground (plus a start's height times SHORTCUT), from the starts and roofs to every
   * cell (Infinity: none). `aided`: the kit is ground like any other. Otherwise a player who got up onto a piece from
   * lower ground is standing there with `lift` below the piece's top (the lower of the ground under it and where they
   * came from, rounded down to LIFT); every other state is at the cell's own height (on ground, or falling past a
   * piece: one jump left, no grip to climb). A cell keeps one state at its own height, the nearest, and the standing
   * states that rise above every one settled before them. */
  const travel = (aided: boolean) => {
    const own = new Float64Array(n * n).fill(Infinity), // the nearest state at the cell's own height
      climbed = new Float32Array(n * n).fill(-Infinity), // the highest standing lift settled on a piece
      out = new Float64Array(n * n).fill(Infinity);
    /** A piece cell's standing states pushed and not beaten: distance and lift, in turn. */
    const pending = new Map<number, number[]>();
    const heap = new Heap();
    const push = (k: number, d: number, from: number) => {
      if (!aided && piece[k] && from < at[k]!) {
        const lift = Math.floor(Math.min(from, under[k]!) / LIFT) * LIFT;
        if (lift <= climbed[k]!) return;
        const states = pending.get(k) ?? pending.set(k, []).get(k)!;
        for (let s = 0; s < states.length; s += 2) if (states[s]! <= d && states[s + 1]! >= lift) return;
        // Drop the states this one beats, then keep it.
        let w = 0;
        for (let s = 0; s < states.length; s += 2)
          if (!(d <= states[s]! && lift >= states[s + 1]!)) {
            states[w++] = states[s]!;
            states[w++] = states[s + 1]!;
          }
        states.length = w;
        states.push(d, lift);
        heap.push(d, k, lift);
      } else if (d < own[k]!) {
        own[k] = d;
        heap.push(d, k, at[k]!);
      }
    };
    /** Could a move landing on q at distance d settle anything new? */
    const worth = (q: number, d: number) => d < own[q]! || (!aided && piece[q] === 1);
    /** Jumps and glides from (x, z), launched at `from` (two jumps if standing, one if falling). */
    const launch = (x: number, z: number, from: number, d: number, standing: boolean) => {
      const rise = standing ? TWO_JUMPS : ONE_JUMP,
        last = standing ? DI.length : oneJump;
      const ci = Math.round((x - x0) / CELL),
        cj = Math.round((z - z0) / CELL);
      for (let o = 0; o < last; o++) {
        const i = ci + DI[o]!,
          j = cj + DJ[o]!;
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const q = i * n + j,
          c = DC[o]!;
        if (stand[q] && at[q]! - from <= rise && worth(q, d + c)) push(q, d + c, from);
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
            if (at[q]! < top && worth(q, d + c) && c <= GLIDE(top - at[q]!)) push(q, d + c, from);
          }
        }
    };
    // A start costs its height: starting a metre lower is worth SHORTCUT m of walking.
    for (const k of starts) push(k, at[k]! * SHORTCUT, at[k]!);
    for (const r of roofs) launch(r.x, r.z, r.y, r.y * SHORTCUT, true);
    while (heap.size) {
      const [d, k, lift] = heap.pop();
      if (lift === at[k]) {
        if (d > own[k]!) continue;
      } else if (lift <= climbed[k]!) continue;
      else climbed[k] = lift;
      out[k] = Math.min(out[k]!, d);
      const i = Math.floor(k / n),
        j = k - i * n;
      // Standing here: on ground, or (without the kit's aid) on a piece they got up onto; falling past one, not.
      const standing = stand[k] === 1 && (aided || !piece[k] || lift < at[k]!);
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          const a = i + di,
            b = j + dj;
          if ((!di && !dj) || a < 0 || b < 0 || a >= n || b >= n) continue;
          const q = a * n + b,
            c = di && dj ? CELL * Math.SQRT2 : CELL;
          if (steps(MOVER, at[q]! - lift, c, deep(k), standing && stand[q] === 1)) push(q, d + c, lift);
        }
      if (!deep(k)) launch(x0 + i * CELL, z0 + j * CELL, lift, d, standing);
    }
    return out;
  };
  const free = travel(true),
    unaided = travel(false);
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

/** A binary min-heap of [distance, cell, lift], kept in three parallel arrays. */
class Heap {
  private d: number[] = [];
  private k: number[] = [];
  private l: number[] = [];
  get size() {
    return this.d.length;
  }
  push(d: number, k: number, l: number) {
    // Sift a hole up from the end, then fill it.
    const { d: D, k: K, l: L } = this;
    let i = D.length;
    D.push(d);
    K.push(k);
    L.push(l);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (D[p]! <= d) break;
      D[i] = D[p]!;
      K[i] = K[p]!;
      L[i] = L[p]!;
      i = p;
    }
    D[i] = d;
    K[i] = k;
    L[i] = l;
  }
  pop(): [number, number, number] {
    const { d: D, k: K, l: L } = this;
    const top: [number, number, number] = [D[0]!, K[0]!, L[0]!];
    const d = D.pop()!,
      k = K.pop()!,
      l = L.pop()!;
    if (!D.length) return top;
    // Sift a hole down from the root for the last entry, then fill it.
    let i = 0;
    for (;;) {
      let m = 2 * i + 1;
      if (m >= D.length) break;
      if (m + 1 < D.length && D[m + 1]! < D[m]!) m++;
      if (D[m]! >= d) break;
      D[i] = D[m]!;
      K[i] = K[m]!;
      L[i] = L[m]!;
      i = m;
    }
    D[i] = d;
    K[i] = k;
    L[i] = l;
    return top;
  }
}
