// The timetabled wagon (src/sim/wagon.ts): a pure function of the tick that shuttles over the laid sections only,
// easing in and out of a dwell at each stop, continuous everywhere and periodic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { wagonAt, wagonCycle, runTicks, WAGON_CRUISE, WAGON_ACCEL, WAGON_DWELL } from '../src/sim/wagon.ts';
import { ROUTE } from '../src/sim/route.ts';

const LAIDS = [1, 2, 3];
const CRUISE_MS = WAGON_CRUISE / 10; // m/s at 10 ticks per second
const EPS = 1e-9;

// Where stop k is: section k's site, or the far end of the last laid section.
const stopAt = (laid: number, k: number): { x: number; z: number } =>
  k < laid ? { x: ROUTE[k].x, z: ROUTE[k].z } : { x: ROUTE[k - 1].to[0], z: ROUTE[k - 1].to[1] };

test('nothing laid: no wagon', () => {
  assert.equal(wagonAt(0, 0), null);
  assert.equal(wagonAt(0, 1234.5, 77), null);
  assert.equal(wagonCycle(0), 0);
});

test('the timetable is integer ticks, and runs never exceed cruise speed or the acceleration cap', () => {
  for (const laid of LAIDS) assert.ok(Number.isInteger(wagonCycle(laid)) && wagonCycle(laid) > 0);
  for (const len of [1, 50, 450, 899, 900, 901, 1803, 5000]) {
    const { ticks, accel } = runTicks(len);
    assert.ok(Number.isInteger(ticks) && Number.isInteger(accel) && ticks >= 2 * accel && accel >= 1, `len ${len}`);
    const peak = len / (ticks - accel);
    assert.ok(peak <= WAGON_CRUISE + EPS, `len ${len} peak ${peak}`);
    assert.ok(peak / accel <= WAGON_CRUISE / WAGON_ACCEL + EPS, `len ${len} accel`);
  }
});

test('deterministic: same inputs, same output', () => {
  for (const laid of LAIDS)
    for (const t of [0, 1, 59.5, 333.25, 1e6 + 0.75, -42.5]) assert.deepEqual(wagonAt(laid, t, 9), wagonAt(laid, t, 9));
});

test('periodic, and t0 shifts the timetable', () => {
  for (const laid of LAIDS) {
    const c = wagonCycle(laid);
    for (let t = 0; t < c; t += 7.25) {
      assert.deepEqual(wagonAt(laid, t + c), wagonAt(laid, t));
      assert.deepEqual(wagonAt(laid, t + 3 * c), wagonAt(laid, t));
      assert.deepEqual(wagonAt(laid, t + 500, 500), wagonAt(laid, t));
    }
  }
});

test('never leaves the laid part, and reaches both ends', () => {
  for (const laid of LAIDS) {
    const end = ROUTE.slice(0, laid).reduce((d, r) => {
      const ex = r.to[0] - r.x;
      const ez = r.to[1] - r.z;
      return d + Math.round(Math.sqrt(ex * ex + ez * ez) * 100);
    }, 0);
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < wagonCycle(laid); t += 0.5) {
      const w = wagonAt(laid, t)!;
      assert.ok(w.section >= 0 && w.section < laid, `laid ${laid} t ${t} section ${w.section}`);
      const r = ROUTE[w.section];
      // On its section's segment: between its two ends, on the line through them.
      const ex = r.to[0] - r.x;
      const ez = r.to[1] - r.z;
      const f = ((w.x - r.x) * ex + (w.z - r.z) * ez) / (ex * ex + ez * ez);
      assert.ok(f >= -EPS && f <= 1 + EPS, `laid ${laid} t ${t} f ${f}`);
      assert.ok(Math.abs((w.x - r.x) * ez - (w.z - r.z) * ex) < 1e-6);
      min = Math.min(min, w.dist);
      max = Math.max(max, w.dist);
    }
    assert.equal(min, 0);
    assert.ok(Math.abs(max - end) < EPS, `laid ${laid} max ${max} end ${end}`);
  }
});

test('dwells for WAGON_DWELL at both ends and at each station, out and back', () => {
  for (const laid of LAIDS) {
    const runs: { stop: number; from: number; len: number }[] = [];
    for (let t = 0; t < wagonCycle(laid); t++) {
      const w = wagonAt(laid, t)!;
      const last = runs[runs.length - 1];
      if (w.stop < 0) continue;
      if (last && last.stop === w.stop && last.from + last.len === t) last.len++;
      else runs.push({ stop: w.stop, from: t, len: 1 });
      const at = stopAt(laid, w.stop);
      assert.ok(Math.abs(w.x - at.x) < EPS && Math.abs(w.z - at.z) < EPS, `laid ${laid} stop ${w.stop} position`);
      assert.equal(w.speed, 0);
      assert.equal(w.vx, 0);
      assert.equal(w.vz, 0);
    }
    // Out 0, 1, ..., laid, back laid - 1, ..., 1; stop 0 again starts the next cycle.
    const order = [...Array(laid + 1).keys(), ...Array.from({ length: laid - 1 }, (_, i) => laid - 1 - i)];
    assert.deepEqual(
      runs.map((r) => r.stop),
      order,
    );
    for (const r of runs) assert.equal(r.len, WAGON_DWELL, `laid ${laid} stop ${r.stop}`);
  }
});

test('speed is 0 at stops, never above cruise, and matches the velocity and the heading', () => {
  for (const laid of LAIDS) {
    let top = 0;
    for (let t = 0; t < wagonCycle(laid); t += 0.25) {
      const w = wagonAt(laid, t)!;
      assert.ok(Math.abs(w.speed) <= CRUISE_MS + EPS, `t ${t} speed ${w.speed}`);
      top = Math.max(top, Math.abs(w.speed));
      assert.ok(Math.abs(Math.hypot(w.dx, w.dz) - 1) < 1e-9);
      assert.ok(Math.abs(Math.hypot(w.vx, w.vz) - Math.abs(w.speed)) < 1e-3 * CRUISE_MS);
      if (w.speed !== 0) {
        assert.equal(Math.sign(w.speed), w.dir);
        assert.ok(w.vx * w.dx + w.vz * w.dz > 0, 'moves along its heading');
      }
    }
    assert.ok(top > 0.9 * CRUISE_MS, `laid ${laid} reaches cruise (${top})`);
  }
});

test('continuous everywhere, including stop boundaries and turnarounds; velocity matches the motion', () => {
  const dt = 0.01;
  for (const laid of LAIDS) {
    for (let t = -1; t < wagonCycle(laid) + 1; t += dt) {
      const a = wagonAt(laid, t)!;
      const b = wagonAt(laid, t + dt)!;
      const step = Math.hypot(b.x - a.x, b.z - a.z);
      // At most cruise speed for dt ticks (plus float noise).
      assert.ok(step <= (CRUISE_MS * dt) / 10 + 1e-9, `laid ${laid} t ${t} step ${step}`);
      assert.ok(Math.abs(b.dist - a.dist) <= WAGON_CRUISE * dt + 1e-6);
      // Finite difference agrees with the reported velocity (m/s), away from section joints.
      if (a.section === b.section && a.dir === b.dir) {
        const fx = ((b.x - a.x) / dt) * 10;
        const fz = ((b.z - a.z) / dt) * 10;
        assert.ok(Math.abs(fx - (a.vx + b.vx) / 2) < 1e-3 && Math.abs(fz - (a.vz + b.vz) / 2) < 1e-3, `t ${t}`);
      }
    }
  }
});

test('fractional ticks agree with integer ticks at integers, and laid beyond the route clamps', () => {
  for (const laid of LAIDS)
    for (let t = 0; t < 400; t++) assert.deepEqual(wagonAt(laid, t + 0.5 - 0.5), wagonAt(laid, t));
  assert.deepEqual(wagonAt(ROUTE.length + 5, 123.5), wagonAt(ROUTE.length, 123.5));
});

test('a tuned pace (a playtest room) keeps the caps, stays continuous, and the default pace is unchanged', () => {
  const pace = { cruise: 65, accel: 20 };
  const cruiseMs = pace.cruise / 10;
  for (const len of [1, 50, 1299, 1300, 1301, 1803]) {
    const { ticks, accel } = runTicks(len, pace);
    const peak = len / (ticks - accel);
    assert.ok(peak <= pace.cruise + EPS && peak / accel <= pace.cruise / pace.accel + EPS, `len ${len}`);
  }
  for (const laid of LAIDS) {
    assert.ok(wagonCycle(laid, pace) < wagonCycle(laid), 'faster round trip');
    assert.deepEqual(wagonAt(laid, 77.5, 3, { cruise: WAGON_CRUISE, accel: WAGON_ACCEL }), wagonAt(laid, 77.5, 3));
    for (let t = 0; t < wagonCycle(laid, pace); t += 0.05) {
      const a = wagonAt(laid, t, 0, pace)!;
      const b = wagonAt(laid, t + 0.05, 0, pace)!;
      assert.ok(Math.abs(a.speed) <= cruiseMs + EPS);
      assert.ok(Math.hypot(b.x - a.x, b.z - a.z) <= (cruiseMs * 0.05) / 10 + 1e-9, `laid ${laid} t ${t}`);
    }
  }
});
