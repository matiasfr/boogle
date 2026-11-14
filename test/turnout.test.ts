// A turnout's parts from two centrelines (src/place/turnout.ts), held against J1, the engine spur off road 2
// (docs/plans/turnouts.md, step 1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { junctions } from '../src/place/junctions.ts';
import { KIT, turnout, type Centre } from '../src/place/turnout.ts';

const j1 = junctions().find((j) => j.id === 'J1')!;
const t = turnout(j1.through, j1.diverging, j1.lever);
const heading = (c: Centre, d: number) => {
  const a = c(d - 0.05),
    b = c(d + 0.05);
  return Math.atan2(b.x - a.x, b.z - a.z);
};
/** Where a point lies by the through road: metres along it from the toe and to its right (road 2 is straight here). */
const byThrough = (p: { x: number; z: number }) => {
  const o = j1.through(0),
    yaw = heading(j1.through, 0);
  const dx = p.x - o.x,
    dz = p.z - o.z;
  return { d: dx * Math.sin(yaw) + dz * Math.cos(yaw), lat: -dx * Math.cos(yaw) + dz * Math.sin(yaw) };
};

test('the toe is tangent', () => {
  const off = Math.abs(heading(j1.diverging, 0.3) - heading(j1.through, 0.3)) * (180 / Math.PI);
  assert.ok(off < 2.5, `${off.toFixed(2)}° at 0.3 m`);
  assert.ok(Math.abs(t.offset(0)) < 1e-6);
});

test('the frog is where the inner rails cross', () => {
  assert.equal(t.hand, 1);
  assert.ok(Math.abs(t.frogD - 5.5) < 0.1, `frog ${t.frogD.toFixed(2)} m from the toe`);
  assert.ok(Math.abs(t.frogAngle - 21.2) < 0.5, `frog angle ${t.frogAngle.toFixed(2)}°`);
  assert.ok(Math.abs(t.clearD - 8.4) < 0.1, `clear ${t.clearD.toFixed(2)} m from the toe`);
  // The nose is on the through road's inner rail, and the diverging road's.
  assert.ok(Math.abs(byThrough(t.nose).lat - KIT.gauge / 2) < 0.01);
  assert.ok(Math.abs(Math.abs(t.offset(t.nose.diverging)) - KIT.gauge) < 0.1);
});

test('a timber spans all four rails', () => {
  assert.equal(t.span(-KIT.head - 0.1), null);
  assert.equal(t.span(t.clearD + 0.1), null);
  for (let d = 0.1; d <= t.clearD; d += 0.1) {
    const [lo, hi] = t.span(d)!;
    const steps = (hi - lo - KIT.sleeper) / KIT.step;
    assert.ok(
      Math.abs(steps - Math.round(steps)) < 1e-6,
      `at ${d.toFixed(1)} m the timber is ${(hi - lo).toFixed(3)} m`,
    );
    // The through road's rails, and the diverging road's where they cross this timber's line.
    const rails = [-KIT.gauge / 2, KIT.gauge / 2];
    for (const side of [-KIT.gauge / 2, KIT.gauge / 2]) {
      let best = { d: Infinity, lat: 0 };
      for (let dd = 0; dd <= d + 3; dd += 0.01) {
        const p = j1.diverging(dd),
          yaw = heading(j1.diverging, dd);
        const at = byThrough({ x: p.x - Math.cos(yaw) * side, z: p.z + Math.sin(yaw) * side });
        if (Math.abs(at.d - d) < Math.abs(best.d - d)) best = at;
      }
      rails.push(best.lat);
    }
    for (const lat of rails)
      assert.ok(
        lat - lo >= 0.5 && hi - lat >= 0.5,
        `at ${d.toFixed(1)} m a rail at ${lat.toFixed(2)} in ${lo} to ${hi}`,
      );
  }
  // The headblocks at the toe run out toward the lever.
  const [lo, hi] = t.span(-0.5)!;
  assert.equal(lo, -KIT.sleeper / 2);
  assert.equal(hi, KIT.sleeper / 2 + KIT.headblock);
});

test('the blade is shorter than the lead', () => {
  assert.ok(t.bladeLen <= 2.4 && t.bladeLen <= t.frogD / 2, `blade ${t.bladeLen.toFixed(2)} m`);
  const blades = t.rails.filter((r) => r.role === 'blade');
  assert.ok(blades.length > 0 && blades.every((r) => r.w < 1));
  // Its tip stands a throw off the through road's far rail; its heel is on the diverging road's inner rail.
  const tip = byThrough(blades[0]!.a),
    heel = blades.at(-1)!.b;
  assert.ok(Math.abs(tip.lat - (-KIT.gauge / 2 + KIT.throw)) < 0.01, `tip ${tip.lat.toFixed(3)} m across`);
  const closure = t.rails.find((r) => r.role === 'closure')!;
  assert.ok(Math.hypot(heel.x - closure.a.x, heel.z - closure.a.z) < 1e-6);
});

test('check rails stand abeam the nose, wings beside the vee', () => {
  const nose = byThrough(t.nose);
  for (const road of ['through', 'diverging'] as const) {
    // Its pieces' middles, by metres along its own road, lie either side of the nose.
    const ds = t.rails.filter((r) => r.role === 'check' && r.road === road).map((r) => r.d - t.nose[road]);
    assert.ok(Math.min(...ds) < -0.5 && Math.max(...ds) > 0.5 && Math.max(...ds) < KIT.check / 2, `${road} check rail`);
  }
  // The through road's check rail is a flangeway inside its far rail.
  for (const r of t.rails.filter((x) => x.role === 'check' && x.road === 'through'))
    assert.ok(Math.abs(byThrough(r.a).lat - (-KIT.gauge / 2 + KIT.rail + KIT.flangeway)) < 1e-6);
  // The closure rail stops short of the through road's inner rail, and the vee's leg takes up past it.
  const closure = t.rails.filter((r) => r.role === 'closure').at(-1)!,
    vee = t.rails.find((r) => r.role === 'vee')!;
  assert.ok(byThrough(closure.b).lat < KIT.gauge / 2 - KIT.rail);
  assert.ok(byThrough(vee.a).lat > KIT.gauge / 2);
  const wings = t.rails.filter((r) => r.role === 'wing');
  assert.equal(wings.length, 2);
  for (const w of wings.filter((r) => r.road === 'through'))
    assert.ok(byThrough(w.b).d <= nose.d + KIT.wingPast + 1e-6);
});
