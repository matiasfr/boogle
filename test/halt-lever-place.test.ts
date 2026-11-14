// The lever rule (docs/plans/running-side.md, steps 1 and 2) and the owner's 14 November report ("the signal to
// request a stop is right next to where I deposit the footings"): every halt's lever stands clear of every prompt a
// footing is worked at, and yields the pick while you carry one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { haltFrame } from '../src/prefab/halt-deck.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../src/prefab/validate.ts';
import { LEVER_REACH } from '../src/place/home-station.ts';
import { RAIL_HALTS, haltPlatform } from '../src/sim/railway-lines.ts';
import * as works from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import {
  RING_BRACE,
  RING_HEAD,
  RING_RIVET,
  RING_STEEL_WORKS,
  RING_STEEL_YARD,
  ringAt,
} from '../src/sim/railway-ring-layout.ts';
import { LEVER_YIELD, railheadLever } from '../src/entities/railway/lever-place.ts';
import { FACING, pickInteract } from '../src/sim/interact-pick.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import kitLevel from '../content/built/levels/halt-kit.json' with { type: 'json' };

/** The knob stands up to this far (m) from its frame's origin: the handle at rest leans 0.22 m along the platform. */
const KNOB = 0.25;
const CLEAR = 3;
type Site = { name: string; x: number; z: number; reach: number };
/** Every site with a reach in the Works' layout (racks, stall, cradle, seams, kiln, the pier's rack and jib), line 2's
 * station frames, and the ring's fixed sites. Camp's line 1 frame and flatbed are left out: both are done with before
 * any train runs, and halts stand only once trains do. Metres. */
const sites: Site[] = [];
const collect = (name: string, v: unknown, depth = 0) => {
  if (!v || typeof v !== 'object' || depth > 3) return;
  const o = v as Record<string, unknown>;
  if (typeof o.x === 'number' && typeof o.z === 'number' && typeof o.reach === 'number')
    sites.push({ name, x: o.x / 100, z: o.z / 100, reach: o.reach / 100 });
  for (const [k, c] of Object.entries(o)) collect(`${name}.${k}`, c, depth + 1);
};
for (const [k, v] of Object.entries(works)) collect(k, v);
LINE2_STATIONS.forEach((s, i) =>
  sites.push({ name: `Q${i + 1}`, x: s.x / 100, z: s.z / 100, reach: RAILWAY_T1.reach / 100 }),
);
for (const [name, s] of Object.entries({ RING_BRACE, RING_RIVET, RING_STEEL_WORKS, RING_STEEL_YARD }))
  sites.push({ name, x: s.x / 100, z: s.z / 100, reach: s.reach / 100 });

const placements = loadLevelArtifact(kitLevel, loadPrefabArtifact(artifact).prefabs).placements;
const levers = placements.filter((p) => p.prefab === 'railway.halt-lever' && !p.params?.ring);
/** Metres between a lever's reach and a site's reach (the server's, 0.4 m wider than the prompt's). */
const clearance = (x: number, z: number, s: Site) => Math.hypot(x - s.x, z - s.z) - KNOB - LEVER_REACH - s.reach;

test("Camp's and the Pier's levers stand within 1.5 m of the platform's -s end and within the server's reach of its centre", () => {
  for (const [row, name] of [
    [1, 'Camp'],
    [5, 'Pier'],
  ] as const) {
    const lever = levers.find((p) => p.id === `halt-lever-${row}-down`)!;
    const { c, yaw, half, hw, h } = haltFrame(row, false);
    const dx = lever.pos[0] - c.x,
      dz = lever.pos[2] - c.z;
    const along = dx * Math.sin(yaw) + dz * Math.cos(yaw),
      across = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) * Math.sign(h.lat);
    assert.ok(along < 0 && along + half <= 1.5 && along + half >= 1, `${name}: ${along + half} m from its -s end`);
    // The boarding half: toward the rails from the centre line, 0.8 m in from the edge.
    assert.ok(Math.abs(hw - across - 0.8) < 1e-9, `${name}: ${hw - across} m from the boarding edge`);
    const id = RAIL_HALTS.findIndex((r) => r.name === name);
    const plat = haltPlatform(id, -1);
    const d = Math.hypot(lever.pos[0] - plat.x / 100, lever.pos[2] - plat.z / 100);
    assert.ok(d + KNOB + LEVER_REACH <= plat.reach / 100, `${name}: an ask from ${d} m is inside the server's reach`);
  }
});

test("every halt's generated lever keeps 3 m between its reach and every footing, rack and frame's reach", () => {
  assert.equal(levers.length, 8);
  assert.ok(sites.some((s) => s.name === 'PIER_FRAME') && sites.some((s) => s.name === 'PIER_RACK'));
  for (const lever of levers)
    for (const s of sites) {
      const gap = clearance(lever.pos[0], lever.pos[2], s);
      assert.ok(gap >= CLEAR, `${lever.id} is ${gap.toFixed(2)} m clear of ${s.name}`);
    }
});

test("the railhead's lever stays clear of its jib and rack at every bent, inside the server's reach", () => {
  RING_HEAD.forEach((head, k) => {
    const { u, lat } = railheadLever(k),
      p = ringAt(u * 100, lat * 100),
      x = p.x / 100,
      z = p.z / 100;
    const site = (name: string, s: { x: number; z: number; reach: number }) => ({
      name,
      x: s.x / 100,
      z: s.z / 100,
      reach: s.reach / 100,
    });
    for (const s of [site('jib', head.jib), site('rivet', RING_RIVET), site('brace', RING_BRACE)])
      assert.ok(clearance(x, z, s) >= CLEAR, `head ${k}: ${clearance(x, z, s).toFixed(2)} m clear of the ${s.name}`);
    // The 25 m platform cannot give the rack 3 m inside the server's reach: the two reaches do not overlap, by 0.6 m
    // at the prompt's reach (the server's less 0.4 m, railhead-view.ts).
    const rack = Math.hypot(x - head.rack.x / 100, z - head.rack.z / 100) - LEVER_REACH - (head.rack.reach / 100 - 0.4);
    assert.ok(rack >= 0.6, `head ${k}: ${rack.toFixed(2)} m clear of the rack`);
    const d = Math.hypot(x - head.platform.x / 100, z - head.platform.z / 100);
    assert.ok(
      d + KNOB <= head.platform.reach / 100,
      `head ${k}: the lever is ${d.toFixed(2)} m from the platform's middle`,
    );
  });
});

test('carrying a footing the jib wins the pick from a lever in reach; with an empty back the lever at hand wins', () => {
  // You stand on the lever's knob, facing it; the jib is at the edge of the widest footing reach, behind you.
  const jib = { at: { x: 0, z: 6 }, run() {} },
    lever = (r: number) => ({ at: { x: 0, z: -0.01 }, r, run() {} });
  const carrying = lever(-LEVER_YIELD);
  assert.equal(pickInteract([carrying, jib], 0, 0, 0, -1), jib);
  assert.ok(LEVER_YIELD > 6 + 2 * FACING);
  // Alone in reach it still answers, and a pulled (blocked) lever never beats the jib.
  assert.equal(pickInteract([carrying], 0, 0, 0, -1), carrying);
  const free = lever(0);
  assert.equal(pickInteract([free, jib], 0, 0, 0, -1), free);
});
