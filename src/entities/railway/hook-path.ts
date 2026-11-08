// Local/Owner hook maths, ported from Place. Plain numbers keep the path independent of render and campaign owners.
export type HookPad = {
  id: string;
  x: number;
  z: number;
  top: number;
  hx: number;
  hz: number;
  look: 'stone' | 'float' | 'wood';
};

export type Point = { x: number; y: number; z: number };
export type HookRing = { id: string; pad: HookPad; at: Point; land: Point };
export const HOOK_CLIMB = ['p2', 't0', 't1', 't2', 't3', 't4', 't5', 'summit'];
export type HookMove = {
  hookCruise: number;
  hookAccel: number;
  hookBrake: number;
  hookExitH: number;
  hookExitUp: number;
};
export type Pull = { ring: HookRing; pts: Point[]; lens: number[]; total: number; s: number; v: number; stall: number };
const FIXED = 1 / 60;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function hookRings<P extends HookPad>(pads: P[], ringAt: (pad: P) => Point, ox: number): HookRing[] {
  return HOOK_CLIMB.map((id) => {
    const pad = pads.find((p) => p.id === id);
    if (!pad) throw new Error(`Missing hook pad ${id}`);
    const at = ringAt(pad);
    return { id, pad, at: { ...at, x: at.x + ox }, land: { x: pad.x + ox, y: pad.top + 0.45 + 0.2, z: pad.z } };
  });
}
export function overLip(ring: HookRing, x: number, z: number): Point {
  const c = ring.land,
    dx = x - c.x,
    dz = z - c.z,
    far = Math.hypot(dx, dz) || 1;
  const ux = dx / far,
    uz = dz / far;
  const edge = Math.min(
    far,
    Math.min(ring.pad.hx / Math.max(Math.abs(ux), 0.01), ring.pad.hz / Math.max(Math.abs(uz), 0.01)) + 0.7,
  );
  return { x: c.x + ux * edge, y: c.y + 0.6, z: c.z + uz * edge };
}
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
export function buildPull(from: Point, ring: HookRing): Pull {
  const a = { ...from };
  const via = [a, { ...a, y: a.y + 0.7 }, overLip(ring, a.x, a.z), { ...ring.land }];
  const pts: Point[] = [],
    lens: number[] = [];
  let total = 0;
  for (let k = 0; k < via.length - 1; k++) {
    const p0 = via[Math.max(0, k - 1)]!,
      p1 = via[k]!,
      p2 = via[k + 1]!,
      p3 = via[Math.min(via.length - 1, k + 2)]!;
    const n = Math.max(2, Math.ceil(distance(p1, p2) / 0.5));
    for (let i = k ? 1 : 0; i <= n; i++) {
      const t = i / n;
      const p = {
        x: cr(p0.x, p1.x, p2.x, p3.x, t),
        y: cr(p0.y, p1.y, p2.y, p3.y, t),
        z: cr(p0.z, p1.z, p2.z, p3.z, t),
      };
      if (pts.length) total += distance(p, pts.at(-1)!);
      pts.push(p);
      lens.push(total);
    }
  }
  return { ring, pts, lens, total, s: 0, v: 0, stall: 0 };
}
export function pathAt(p: Pull, s: number): Point {
  let k = 1;
  while (k < p.lens.length - 1 && p.lens[k]! < s) k++;
  const a = p.lens[k - 1]!,
    b = p.lens[k]!,
    t = b > a ? Math.min(1, (s - a) / (b - a)) : 1;
  const from = p.pts[k - 1]!,
    to = p.pts[k]!;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
}
export function stepPull(p: Pull, pos: Point, move: HookMove) {
  const left = p.total - p.s;
  p.v = Math.min(move.hookCruise, p.v + move.hookAccel * FIXED, Math.sqrt(2 * move.hookBrake * Math.max(0, left)));
  p.s = Math.min(p.total, p.s + Math.max(p.v, 1) * FIXED);
  const at = pathAt(p, p.s),
    err = distance(at, pos);
  p.stall = err > 1.1 ? p.stall + FIXED : 0;
  const done = p.total - p.s < 0.05 && distance(pos, p.ring.land) < 0.05,
    stall = p.stall > 0.18;
  const scale = Math.min(1 / FIXED, (move.hookCruise * 1.4) / (err || 1));
  return {
    v: done
      ? { x: 0, y: 0, z: 0 }
      : { x: (at.x - pos.x) * scale, y: (at.y - pos.y) * scale, z: (at.z - pos.z) * scale },
    done,
    stall,
  };
}
export function cancelVelocity(v: Point, move: HookMove): Point {
  const h = Math.hypot(v.x, v.z),
    k = h > move.hookExitH ? move.hookExitH / h : 1;
  return { x: v.x * k, y: Math.min(v.y, move.hookExitUp), z: v.z * k };
}
export function ringScore(dot: number, distance: number, cone: number) {
  return dot < Math.cos((cone * Math.PI) / 180) ? -1 : Math.acos(Math.min(1, dot)) * 1.4 + distance / 90 + 0.001;
}
export function holdPick() {
  let rival: string | null = null,
    rivalAt = 0;
  return (current: string | null, currentScore: number, best: string | null, bestScore: number, now: number) => {
    if (current && currentScore < Infinity && best !== current) {
      if (bestScore > currentScore * 0.8) {
        rival = null;
        return current;
      }
      if (rival !== best) {
        rival = best;
        rivalAt = now;
        return current;
      }
      if (now - rivalAt < 150) return current;
    }
    rival = null;
    return best;
  };
}
export function createHookLatch() {
  let owned = false,
    missing = 0;
  return (ready: boolean, hook: boolean, dt: number) => {
    if (ready) {
      missing = hook ? 0 : missing + dt;
      if (hook) owned = true;
      else if (missing >= 2) owned = false;
    }
    return owned;
  };
}
