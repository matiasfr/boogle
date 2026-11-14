// A train's wheels against the rails as drawn (review, 14 November, round two): trains read the up track along the
// line's smooth heading (layout.ts lineSmoothAt) while track.ts draws its rails from the stepped one. The two readings
// are one curve to within 3 cm, and at the platforms and crossings to within 1 cm; what stands a wheel off a rail is
// the rail itself, a straight box 2 to 4 m long (today's track sets each at its middle's heading), up to 19 cm on a
// bend on either track. That is the track view's piece model and is pinned here so it gets no worse: the smooth
// reading is never further off the rails than the stepped one was.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { FORMATION, HALTS, LINKS, ORIGIN, UP_HALTS, lineAt, lineSmoothAt, upLat } from '../src/place/layout.ts';
import { trackBoxes } from '../dev/level/grounding-track.ts';

type P = { x: number; z: number };
const p = { x: 0, z: 0, ux: 0, uz: 1 };
/** Line `k`'s track at `s`, as a train reads it (`smooth`) or as the rails are drawn. */
function trackAt(k: number, s: number, up: boolean, smooth: boolean): P {
  const link = LINKS[k]!;
  (smooth ? lineSmoothAt : lineAt)(link.line, s, p);
  const l = up ? (upLat(FORMATION[link.id], s, smooth) ?? 0) : 0;
  return { x: p.x - p.uz * l + ORIGIN.x, z: p.z + p.ux * l + ORIGIN.z };
}
const toSegment = (q: P, a: P, b: P) => {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(q.x - a.x - t * dx, q.z - a.z - t * dz);
};
/** Every drawn rail of line `k` as a segment along its box. */
function railsOf(k: number): [P, P][] {
  const row = trackBoxes().find((t) => t.spec.id === LINKS[k]!.id && t.mode === 'panels')!;
  return row.boxes.flatMap((b, i) =>
    row.kinds[i] !== 'rail'
      ? []
      : [
          [-0.5, 0.5].map((z) => {
            const v = new THREE.Vector3(0, 0, z).applyMatrix4(b.local);
            return { x: v.x + b.x, z: v.z + b.z };
          }) as [P, P],
        ],
  );
}
/** The furthest any wheel of a car stands from a rail, the car anywhere along the track every 0.05 m. */
function worstWheel(k: number, up: boolean, smooth: boolean, rails: [P, P][]) {
  const f = FORMATION[LINKS[k]!.id];
  const from = up ? f.from + 1 : 14,
    to = up ? Math.min(f.to - 1, 520) : k ? 520 : 205;
  let worst = 0;
  for (let s = from; s <= to; s += 0.05) {
    const a = trackAt(k, s + 1.1, up, smooth),
      b = trackAt(k, s - 1.1, up, smooth);
    const yaw = Math.atan2(a.x - b.x, a.z - b.z),
      cx = (a.x + b.x) / 2,
      cz = (a.z + b.z) / 2;
    for (const x of [-0.5, 0.5])
      for (const z of [-1.1, 1.1]) {
        const w = { x: cx + x * Math.cos(yaw) + z * Math.sin(yaw), z: cz - x * Math.sin(yaw) + z * Math.cos(yaw) };
        let near = Infinity;
        for (const [ra, rb] of rails)
          if (Math.abs(ra.x - w.x) < 6 && Math.abs(ra.z - w.z) < 6) near = Math.min(near, toSegment(w, ra, rb));
        worst = Math.max(worst, near);
      }
  }
  return worst;
}
/** How far the rails' reading of the up track is from the trains', over s0 to s1. */
function apart(k: number, s0: number, s1: number, up: boolean) {
  let worst = 0;
  for (let s = s0; s <= s1; s += 0.05) {
    const q = trackAt(k, s, up, false);
    // The trains' curve within 1.5 m of the line either way (the readings differ by a step back of 0.6 m at most).
    let near = Infinity,
      a = trackAt(k, s - 1.5, up, true);
    for (let t = s - 1.5 + 0.05; t <= s + 1.5; t += 0.05) {
      const b = trackAt(k, t, up, true);
      near = Math.min(near, toSegment(q, a, b));
      a = b;
    }
    worst = Math.max(worst, near);
  }
  return worst;
}

test('wheels on the drawn rails: the smooth reading is no further off than the stepped one, and under its ceiling', () => {
  // Ceilings, m: what the straight rail pieces leave today (measured 14 November: line 1 0.121 down, 0.163 up; line 2
  // 0.149 down, 0.123 up; the stepped reading 0.189 and 0.130 on the up tracks).
  const ceiling = [
    [0.125, 0.165],
    [0.15, 0.125],
  ];
  for (const k of [0, 1]) {
    const rails = railsOf(k);
    for (const up of [false, true]) {
      const smooth = worstWheel(k, up, true, rails),
        stepped = worstWheel(k, up, false, rails);
      const name = `line ${k + 1} ${up ? 'up' : 'down'}`;
      assert.ok(smooth <= stepped + 1e-6, `${name}: smooth ${smooth.toFixed(4)} over stepped ${stepped.toFixed(4)}`);
      assert.ok(smooth <= ceiling[k]![up ? 1 : 0]!, `${name}: ${smooth.toFixed(4)} m`);
    }
  }
});

test('the two readings of an up track are one curve: 3 cm at most, 1 cm at every platform and crossing', () => {
  for (const k of [0, 1]) {
    const f = FORMATION[LINKS[k]!.id];
    const all = apart(k, f.from + 1, Math.min(f.to, 520) - 1, true);
    assert.ok(all < 0.03, `line ${k + 1}: ${all.toFixed(4)} m`);
  }
  for (const h of HALTS) assert.ok(apart(h.line, h.s0, h.s1, false) < 1e-6, h.name);
  for (const h of UP_HALTS) {
    assert.ok(apart(h.line, h.s0, h.s1, true) < 0.01, h.name);
    assert.ok(apart(h.line, h.crossS - 1.2, h.crossS + 1.2, true) < 0.01, `${h.name} crossing`);
  }
});
