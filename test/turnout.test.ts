// A turnout's parts from two centrelines (src/place/turnout.ts), held against J1, the engine spur off road 2
// (docs/plans/turnouts.md, step 1), then the whole list J1 to J9 (step 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { junctions } from '../src/place/junctions.ts';
import { KIT, turnout, type Centre } from '../src/place/turnout.ts';
import { FORMATION, LINKS } from '../src/place/layout.ts';
import { RAIL_LINES } from '../src/sim/railway-lines.ts';
import { sleeperStations } from '../src/entities/railway/track-panels.ts';

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

// Step 2: the whole list (docs/plans/turnouts.md, "Every place two tracks meet"), measured from the two centrelines.
// Where step 2 measured a figure that differs from the plan's first table, the measured one is here and in the plan:
// J2's frog angle is 28.4° (the table had 29.1°), and the line turnouts clear at 11.0 m and the crossover at 12.1 m
// (11.1 and 12.2).
const TABLE: Record<string, { hand: 1 | -1; frogD: number; angle: number; clearD: number }> = {
  J1: { hand: 1, frogD: 5.5, angle: 21.2, clearD: 8.4 },
  J2: { hand: -1, frogD: 4.1, angle: 28.4, clearD: 6.4 },
  J3: { hand: -1, frogD: 6.2, angle: 12.7, clearD: 12.1 },
  J4: { hand: -1, frogD: 6.5, angle: 14.8, clearD: 11.0 },
  J5: { hand: 1, frogD: 6.5, angle: 14.8, clearD: 11.0 },
  J6: { hand: -1, frogD: 6.5, angle: 14.8, clearD: 11.0 },
  J7: { hand: 1, frogD: 7.2, angle: 13.5, clearD: 12.1 },
  J8: { hand: 1, frogD: 7.2, angle: 13.4, clearD: 12.1 },
  J9: { hand: 1, frogD: 6.5, angle: 14.8, clearD: 11.0 },
};
const all = junctions();

test('the list is J1 to J9, each once', () => {
  assert.deepEqual(
    all.map((j) => j.id),
    Object.keys(TABLE),
  );
});

for (const j of all) {
  const want = TABLE[j.id]!;
  test(`${j.id}: the toe is tangent, the frog and hand are the table's`, () => {
    const off = Math.abs(heading(j.diverging, 0.3) - heading(j.through, 0.3)) * (180 / Math.PI);
    assert.ok(off < 2.5, `${off.toFixed(2)}° at 0.3 m`);
    const tj = turnout(j.through, j.diverging, j.lever);
    // Within a millimetre: the leg's arcs are given to 10 µm (home-station.ts LEG).
    assert.ok(Math.abs(tj.offset(0)) < 1e-3, `${tj.offset(0)} m apart at the toe`);
    assert.equal(tj.hand, want.hand);
    assert.ok(Math.abs(tj.frogD - want.frogD) < 0.1, `frog ${tj.frogD.toFixed(2)} m from the toe`);
    assert.ok(Math.abs(tj.frogAngle - want.angle) < 0.5, `frog angle ${tj.frogAngle.toFixed(2)}°`);
    assert.ok(Math.abs(tj.clearD - want.clearD) < 0.1, `clear ${tj.clearD.toFixed(2)} m from the toe`);
  });
}

test('every line end the layout draws has a junction', () => {
  // Lines 1 and 2's ends that the formation draws (its stub turnouts and Far Head's crossover); the railhead's, Ring
  // Island's and the greybox stack's are drawn by their own views and come with step 7.
  for (const [k, id] of [
    [0, 'timber'],
    [1, 'quarry'],
  ] as const) {
    const f = FORMATION[id],
      drawn = [f.from, f.to, ...(f.crossover ? [f.crossover[0]] : [])];
    const ends = RAIL_LINES[k]!.halts.flatMap((h) => (h.end ? [h.end.mergeCm / 100] : [])).filter((s) =>
      drawn.includes(s),
    );
    assert.equal(ends.length, drawn.length, `${id}: the catalog has an end at each of ${drawn.join(', ')}`);
    for (const s of ends)
      assert.ok(
        all.some((j) => j.line === id && j.s === s && j.kind !== 'spur'),
        `${id}: no junction at the end merging at s ${s}`,
      );
  }
});

test('one timber per station in a cluster (J3 with J4)', () => {
  const j3 = all.find((j) => j.id === 'J3')!,
    j4 = all.find((j) => j.id === 'J4')!;
  const t3 = turnout(j3.through, j3.diverging, j3.lever),
    t4 = turnout(j4.through, j4.diverging, j4.lever);
  // Both stand on line 1: J4 runs with its s from s 36, J3 against it from s 54, so J3's right is line 1's left.
  let shared = 0;
  for (const { s } of sleeperStations(LINKS[0]!, 30, 60)) {
    const a = t4.span(s - j4.s),
      b3 = t3.span(j3.s - s),
      b = b3 && ([-b3[1], -b3[0]] as const);
    if (!a || !b) continue;
    shared++;
    // The two spans meet under the through road, so one timber, their union, carries all six rails.
    assert.ok(a[0] <= b[1] && b[0] <= a[1], `s ${s.toFixed(1)}: spans ${a} and ${b} do not meet`);
    const len = Math.max(a[1], b[1]) - Math.min(a[0], b[0]),
      steps = (len - KIT.sleeper) / KIT.step;
    assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `s ${s.toFixed(1)}: one timber of ${len.toFixed(3)} m`);
  }
  assert.ok(shared >= 3, `the zones share ${shared} stations`);
});
