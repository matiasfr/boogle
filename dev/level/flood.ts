// Where the player can get to on a height grid, from a start: no game imports, so test/level-flood.test.ts can hand it a
// made-up grid. What a step allows is what the controller does (src/entities/player/state.ts):
//   - Down is always open. Nothing limits a fall.
//   - Up needs ground to stand on at both ends. A quad steeper than `walkSlope` isn't ground: contacts on it don't count,
//     so there's no grip and no jump (run on a ramp in Rapier: 1.50 climbs, 1.55 doesn't, with the limit at 1.52).
//   - Up is then a step of at most `walkSlope`, or of at most `jumpHeight`. (On the game's 1.25 m grid the slope always
//     allows more than the jump; a jump decides only with a finer grid, and over low props.)
//   - In `swim` mode, water deeper than `wade` carries you at the surface; otherwise it stops you. Out of the water, a
//     swimmer gets up only `swimHop`.

export type Grid = {
  n: number; // nodes along each side
  cell: number; // metres between nodes
  h: ArrayLike<number>; // metres, at i * n + j
};
export type Mover = { walkSlope: number; jumpHeight: number; wade: number; swimHop: number };
export type FloodOptions = {
  swim?: boolean;
  blocked?: Uint8Array; // nodes you can't stand in
  reverse?: boolean; // the nodes that can get TO the starts, rather than the nodes the starts get to
};

/** 1 for each node with a walkable quad beside it. */
export function standable({ n, cell, h }: Grid, { walkSlope }: Mover) {
  const stand = new Uint8Array(n * n);
  const max = (walkSlope * cell) ** 2;
  for (let i = 0; i + 1 < n; i++)
    for (let j = 0; j + 1 < n; j++) {
      const a = h[i * n + j]!,
        b = h[(i + 1) * n + j]!,
        c = h[i * n + j + 1]!,
        d = h[(i + 1) * n + j + 1]!;
      const gx = (b + d - a - c) / 2,
        gz = (c + d - a - b) / 2;
      if (gx * gx + gz * gz > max) continue;
      stand[i * n + j] = stand[(i + 1) * n + j] = stand[i * n + j + 1] = stand[(i + 1) * n + j + 1] = 1;
    }
  return stand;
}

const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** 1 for each node reached from `starts` (node indices). */
export function flood(grid: Grid, mover: Mover, starts: number[], options: FloodOptions = {}) {
  const { n, cell, h } = grid;
  const { swim = false, blocked, reverse = false } = options;
  const { walkSlope, jumpHeight, wade, swimHop } = mover;
  const stand = standable(grid, mover);
  const deep = (k: number) => h[k]! < -wade;
  const level = (k: number) => Math.max(h[k]!, -wade); // what you stand or float at
  const open = (k: number) => !blocked?.[k] && (swim || !deep(k));
  const grips = (k: number) => stand[k]! === 1;
  // Can you go from a to b, c metres apart?
  const can = (a: number, b: number, c: number) => {
    const rise = level(b) - level(a);
    if (rise <= 0) return true;
    if (deep(a)) return rise <= swimHop;
    return grips(a) && grips(b) && (rise <= jumpHeight || rise <= walkSlope * c);
  };
  const seen = new Uint8Array(n * n);
  const stack: number[] = [];
  for (const k of starts) {
    seen[k] = 1;
    stack.push(k);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const i = Math.floor(k / n),
      j = k - i * n;
    for (const [di, dj] of STEPS) {
      const a = i + di,
        b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n) continue;
      const q = a * n + b;
      if (seen[q] || !open(q)) continue;
      const c = di && dj ? cell * Math.SQRT2 : cell;
      if (reverse ? can(q, k, c) : can(k, q, c)) {
        seen[q] = 1;
        stack.push(q);
      }
    }
  }
  return seen;
}
