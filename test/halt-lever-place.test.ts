// The lever rule (docs/plans/running-side.md, steps 1 and 2) and the owner's 14 November report ("the signal to
// request a stop is right next to where I deposit the footings"): every halt's lever stands clear of every prompt a
// footing is worked at, yields the pick only where a footing is worked, and offers no ask the server would refuse.
// Clearances are measured from the knob (the prompt's centre) over the handle's whole travel, not the frame's origin
// (independent review, 14 November).
import test from 'node:test';
import assert from 'node:assert/strict';
import { haltFrame } from '../src/prefab/halt-deck.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../src/prefab/validate.ts';
import { KNOB_TRAVEL } from '../src/prefab/builders/halt-lever.ts';
import { LEVER_REACH } from '../src/place/home-station.ts';
import { FORGE_FRAME, HALTS, OFFSET_HALTS, TUNE, toWorld } from '../src/place/layout.ts';
import { LINE_HALTS } from '../src/sim/railway-train.ts';
import { LINE2, RAIL_HALTS, haltPlatform } from '../src/sim/railway-lines.ts';
import * as works from '../src/sim/railway-works-layout.ts';
import { LINE2_BOILER, LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import {
  RING_BRACE,
  RING_HALT,
  RING_HEAD,
  RING_JOINT_UP,
  RING_RIVET,
  RING_STEEL_WORKS,
  RING_STEEL_YARD,
  ringAt,
} from '../src/sim/railway-ring-layout.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { ringHead } from '../src/sim/railway-queries.ts';
import { railCallReady, trainStops } from '../src/sim/railway-queries-trains.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import {
  LEVER_YIELD,
  RING_LEVER_OFF,
  footingSites,
  leverAskTaken,
  leverPlatform,
  leverYield,
  railheadLever,
} from '../src/entities/railway/lever-place.ts';
import { FACING, pickInteract } from '../src/sim/interact-pick.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import kitLevel from '../content/built/levels/halt-kit.json' with { type: 'json' };

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
const site = (name: string, s: { x: number; z: number; reach: number }): Site => ({
  name,
  x: s.x / 100,
  z: s.z / 100,
  reach: s.reach / 100,
});

const placements = loadLevelArtifact(kitLevel, loadPrefabArtifact(artifact).prefabs).placements;
const levers = placements.filter((p) => p.prefab === 'railway.halt-lever' && !p.params?.ring);

test('the waiting boiler and breaker cannot steal a halt lever or forge deposit: their prompt reaches are disjoint', () => {
  for (const [name, part] of [
    ['boiler', LINE2_BOILER],
    ['breaker', works.WORKS_BREAKER],
  ] as const) {
    const reach = part.reach / 100 - 0.6;
    assert.equal(reach, 6);
    const p = { x: part.x / 100, z: part.z / 100 };
    // Forge deposits are automatic inside reachStation; no competing take is offered anywhere in that circle.
    assert.ok(Math.hypot(p.x - toWorld(FORGE_FRAME.x), p.z - FORGE_FRAME.z) > reach + TUNE.reachStation, name);
    for (const lever of levers) {
      const yaw = lever.rot![0];
      for (const knob of knobs(lever.pos[0], lever.pos[2], Math.sin(yaw), Math.cos(yaw)))
        assert.ok(Math.hypot(p.x - knob.x, p.z - knob.z) > reach + LEVER_REACH, `${name}: ${lever.id}`);
    }
  }
});
/** A frame at (x, z) whose local +z runs along the unit (ux, uz): its knob at 21 steps of the handle's travel. */
const knobs = (x: number, z: number, ux: number, uz: number) =>
  Array.from({ length: 21 }, (_, i) => {
    const t = KNOB_TRAVEL[0] + ((KNOB_TRAVEL[1] - KNOB_TRAVEL[0]) * i) / 20;
    return { x: x + ux * t, z: z + uz * t };
  });
/** The least metres between the lever's reach, from any knob, and a site's reach of `reach` m. */
const clearance = (ks: { x: number; z: number }[], s: Site, reach = s.reach) =>
  Math.min(...ks.map((k) => Math.hypot(k.x - s.x, k.z - s.z))) - LEVER_REACH - reach;
/** The railhead's lever at head `k`: its knobs, from the frame's place and the ring's heading there. */
function railheadKnobs(k: number) {
  const { u, lat } = railheadLever(k),
    p = ringAt(u * 100, lat * 100),
    q = ringAt(u * 100 + 100, lat * 100),
    d = Math.hypot(q.x - p.x, q.z - p.z);
  return knobs(p.x / 100, p.z / 100, (q.x - p.x) / d, (q.z - p.z) / d);
}

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
    const plat = haltPlatform(id, -1, 0, true);
    // Anywhere the prompt is offered (LEVER_REACH of any knob) is inside the server's flat reach.
    for (const k of knobs(lever.pos[0], lever.pos[2], Math.sin(yaw), Math.cos(yaw))) {
      const d = Math.hypot(k.x - plat.x / 100, k.z - plat.z / 100);
      assert.ok(d + LEVER_REACH <= plat.reach / 100, `${name}: an ask ${d} m out is inside the server's reach`);
    }
  }
});

test("every halt's generated lever keeps 3 m between its knob's reach and every footing, rack and frame's reach", () => {
  assert.equal(levers.length, 9);
  assert.ok(sites.some((s) => s.name === 'PIER_FRAME') && sites.some((s) => s.name === 'PIER_RACK'));
  let least = Infinity,
    tight = '';
  for (const lever of levers) {
    const yaw = lever.rot![0];
    const ks = knobs(lever.pos[0], lever.pos[2], Math.sin(yaw), Math.cos(yaw));
    for (const s of sites) {
      const gap = clearance(ks, s);
      if (gap < least) [least, tight] = [gap, `${lever.id} against ${s.name}`];
      assert.ok(gap >= CLEAR, `${lever.id} is ${gap.toFixed(2)} m clear of ${s.name}`);
    }
  }
  // The tightest today (Far Head's second lever stood by Q6's frame at 3.3 to 3.9 m until it moved to its -s end).
  assert.ok(least > 3.9 && least < 4, `the least clearance is ${least.toFixed(3)} m (${tight})`);
});

// Right-hand running (docs/plans/running-side.md, step 4): a second platform is the homeward train's, and its lever
// stands at the -s end, the way that train leaves.
test("the second platforms' levers stand within 1.5 m of the -s end, inside the server's reach of the homeward platform", () => {
  OFFSET_HALTS.forEach((u, row) => {
    const lever = levers.find((p) => p.id === `halt-lever-${row}-up`)!;
    const { c, yaw, half } = haltFrame(row, true);
    const along = (lever.pos[0] - c.x) * Math.sin(yaw) + (lever.pos[2] - c.z) * Math.cos(yaw);
    assert.ok(along < 0 && along + half <= 1.5 && along + half >= 1, `row ${row}: ${along + half} m from its -s end`);
    const name = u.pair === HALTS.length ? 'Pier' : HALTS[u.pair]!.name,
      plat = haltPlatform(
        RAIL_HALTS.findIndex((r) => r.name === name),
        -1,
      );
    for (const k of knobs(lever.pos[0], lever.pos[2], Math.sin(yaw), Math.cos(yaw))) {
      const d = Math.hypot(k.x - plat.x / 100, k.z - plat.z / 100);
      assert.ok(d + LEVER_REACH <= plat.reach / 100, `${name}: an ask ${d} m out is inside the server's reach`);
    }
  });
});

// A first platform's lever is generated at the +s end, for the train going on; while its halt is the line's open end
// it calls the train home and halts-view.ts stands it 2 (half - 1.4) m back, at the -s end (Far Head before the pier).
test("Far Head's first lever restood for the train home is at the -s end, in the end's reach and 3 m clear of every site", () => {
  const row = HALTS.findIndex((h) => h.name === 'Far Head'),
    lever = levers.find((p) => p.id === `halt-lever-${row}-down`)!;
  const { c, yaw, half } = haltFrame(row, false);
  const [ux, uz] = [Math.sin(yaw), Math.cos(yaw)];
  const on = (lever.pos[0] - c.x) * ux + (lever.pos[2] - c.z) * uz;
  assert.ok(Math.abs(half - on - 1.4) < 1e-9, `generated ${half - on} m from the +s end`);
  const shift = -2 * (half - 1.4),
    ks = knobs(lever.pos[0] + ux * shift, lever.pos[2] + uz * shift, ux, uz);
  // As the end, both ways are judged from the first platform.
  const plat = haltPlatform(
    RAIL_HALTS.findIndex((r) => r.name === 'Far Head'),
    -1,
    0,
    true,
  );
  for (const k of ks) {
    const d = Math.hypot(k.x - plat.x / 100, k.z - plat.z / 100);
    assert.ok(d + LEVER_REACH <= plat.reach / 100, `an ask ${d} m out is inside the server's reach`);
  }
  for (const s of sites) assert.ok(clearance(ks, s) >= CLEAR, `${clearance(ks, s).toFixed(2)} m clear of ${s.name}`);
});

// The joint's and Ring Island's levers stand RING_LEVER_OFF from their platform's middle, and the railhead's east one
// for the train on stands 6 m short of its far end: all inside the server's reach, prompt and all.
test("the ring's restood levers are inside the server's reach of their platforms", () => {
  const last = RING_HEAD.length - 1;
  for (const [name, u, lat, plat] of [
    ['joint west', 247.5 - RING_LEVER_OFF, -6.3, RING_JOINT_UP],
    ['island east, home', 448 - RING_LEVER_OFF, 2.45, RING_HALT.down],
    ['island east, on', 448 + RING_LEVER_OFF, 2.45, RING_HALT.down],
    ['island west', 448 - RING_LEVER_OFF, -6.3, RING_HALT.up],
    ['railhead east, on', railheadLever(last, 1).u, railheadLever(last, 1).lat, RING_HEAD[last]!.platform],
  ] as const) {
    const p = ringAt(u * 100, lat * 100),
      d = Math.hypot(p.x - plat.x, p.z - plat.z) / 100;
    assert.ok(d + KNOB_TRAVEL[1] + LEVER_REACH <= plat.reach / 100, `${name}: ${d.toFixed(2)} m from the middle`);
  }
  // The island's home levers keep the steel works' yard's reach 3 m off (u 457 stood 0.5 m from the works').
  const home = ringAt((448 - RING_LEVER_OFF) * 100, 245);
  for (const s of [RING_STEEL_WORKS, RING_STEEL_YARD])
    assert.ok(Math.hypot(home.x - s.x, home.z - s.z) / 100 - LEVER_REACH - s.reach / 100 >= CLEAR);
});

test("the railhead's knob stays clear of its jib and rack over the handle's travel at every bent", () => {
  RING_HEAD.forEach((head, k) => {
    const ks = railheadKnobs(k);
    for (const s of [site('jib', head.jib), site('rivet', RING_RIVET), site('brace', RING_BRACE)])
      assert.ok(clearance(ks, s) >= CLEAR, `head ${k}: ${clearance(ks, s).toFixed(2)} m clear of the ${s.name}`);
    // The rack is on the same 25 m platform, so 3 m is not to be had: the prompts' reaches (the rack's is the
    // server's less 0.4 m, railhead-view.ts) end 0.95 m apart with the handle over, 1.58 m at rest; the server's own
    // reach of the rack still ends 0.55 m short of the lever's.
    const rack = site('rack', head.rack);
    const prompt = clearance(ks, rack, rack.reach - 0.4),
      atRest = clearance(ks.slice(0, 1), rack, rack.reach - 0.4);
    assert.ok(prompt >= 0.9 && prompt < 1, `head ${k}: ${prompt.toFixed(3)} m clear of the rack's prompt`);
    assert.ok(atRest >= 1.5, `head ${k}: ${atRest.toFixed(3)} m clear of the rack's prompt at rest`);
    assert.ok(clearance(ks, rack) >= 0.5, `head ${k}: ${clearance(ks, rack).toFixed(3)} m clear of the rack`);
    // The frame stands on the platform, inside the server's flat reach of its middle.
    const { u } = railheadLever(k);
    assert.ok(u * 100 - (head.u - 2500) >= 50, `head ${k}: the frame is on the platform`);
    for (const p of ks) {
      const d = Math.hypot(p.x - head.platform.x / 100, p.z - head.platform.z / 100);
      assert.ok(d <= head.platform.reach / 100, `head ${k}: the knob is ${d.toFixed(2)} m from the platform's middle`);
    }
  });
});

test("a lever's prompt guard is the server's rail.call position test, by reach and by height, at every bent", () => {
  // The reviewer's probe: at head 0 a jump to y 24.8 over the railhead's knob is over the server's ceiling (24.7).
  const plat0 = RING_HEAD[0]!.platform,
    k0 = railheadKnobs(0)[0]!;
  assert.equal(plat0.y + 40 + 260, 2470);
  assert.equal(leverAskTaken(plat0, k0.x, 24.8, k0.z), false);
  assert.equal(leverAskTaken(plat0, k0.x, 24.7, k0.z), true);
  RING_HEAD.forEach((head, k) => {
    const p = head.platform,
      top = (p.y + 300) / 100,
      low = (p.y - 220) / 100;
    for (const kn of railheadKnobs(k)) {
      assert.equal(leverAskTaken(p, kn.x, top, kn.z), true, `head ${k}: at the ceiling`);
      assert.equal(leverAskTaken(p, kn.x, top + 0.011, kn.z), false, `head ${k}: over the ceiling`);
      assert.equal(leverAskTaken(p, kn.x, low, kn.z), true, `head ${k}: at the floor`);
      assert.equal(leverAskTaken(p, kn.x, low - 0.011, kn.z), false, `head ${k}: under the floor`);
    }
    // Flat: 12.6 m from the platform's middle is taken, a centimetre more is not.
    assert.equal(leverAskTaken(p, (p.x + p.reach) / 100, p.y / 100, p.z / 100), true);
    assert.equal(leverAskTaken(p, (p.x + p.reach + 1) / 100, p.y / 100, p.z / 100), false);
  });
  // And it is the server's answer, for every halt's lever ask both ways, over a grid round each platform, in worlds
  // with the railhead at its first head and at its last.
  for (const stage of ['trains-on', 'deck-laid', 'ring-joined'] as const) {
    const { w, t } = buildSeedWorld(stage);
    let asked = 0;
    for (const [id, h] of LINE_HALTS.entries())
      for (const dir of [-1, 1] as const) {
        const plat = leverPlatform(w, id, dir, t);
        const stops = trainStops(w, h.line);
        const chained = !railCallReady(w, h.line, h.stop, dir, t, stops);
        for (const dx of [-1400, -1261, -1259, -600, 0, 700, 1259, 1261])
          for (const dy of [-400, -221, -220, 0, 299, 300, 301, 500]) {
            const at = [plat.x + dx, plat.y + dy, plat.z + Math.round(dx / 7)] as const;
            const actor: Actor = {
              reach: (x, z, r) => (at[0] - x) ** 2 + (at[2] - z) ** 2 <= r * r,
              height: (y, r) => Math.abs(at[1] - y) <= r,
              cadence: () => true,
            };
            const server = railValid(w as never, { op: 'rail.call', id, dir } as never, actor, t);
            const client = !chained && leverAskTaken(plat, at[0] / 100, at[1] / 100, at[2] / 100);
            assert.equal(client, server, `${stage} ${h.name} way ${dir} at ${at.join(', ')} cm`);
            asked++;
          }
      }
    assert.ok(asked >= 64 * 2 * 6, `${stage}: ${asked} asks compared`);
    if (stage !== 'trains-on') assert.equal(ringHead(w), stage === 'deck-laid' ? 0 : 7);
    assert.ok(LINE_HALTS.some((h) => h.line === LINE2));
  }
});

test('carrying a footing a lever yields only where a footing is worked: a loose pile beside it does not beat it', () => {
  const head = 0,
    jibAt = site('jib', RING_HEAD[head]!.jib);
  // Away from every footing site (Camp's platform), carrying or not, the lever is not pushed back.
  assert.equal(leverYield(true, 999, -146.5, head), 0);
  assert.equal(leverYield(false, jibAt.x, jibAt.z, head), 0);
  // The reviewer's probe: you carry a footing and aim straight at the lever 1 m ahead; a runnable pile lies 0.6 m
  // to your side. The lever is picked.
  const pile = { at: { x: 0.6, z: 0 }, run() {} },
    lever = (r: number) => ({ at: { x: 0, z: -1 }, r, run() {} });
  const here = lever(leverYield(true, 999, -146.5, head));
  assert.equal(pickInteract([here, pile], 0, 0, 0, -1), here);
  // Inside each footing site's reach, carrying, it yields; a centimetre outside it does not.
  for (const s of footingSites(head)) {
    assert.equal(leverYield(true, (s.x + s.reach) / 100, s.z / 100, head), -LEVER_YIELD);
    assert.equal(leverYield(true, (s.x + s.reach + 1) / 100, s.z / 100, head), 0);
  }
  assert.equal(footingSites(3)[2], RING_HEAD[3]!.rack);
  assert.equal(footingSites(3)[5], RING_HEAD[3]!.jib);
});

test('where it yields, the jib wins the pick from a lever in reach; with an empty back the lever at hand wins', () => {
  // You stand on the lever's knob, facing it; the jib is at the edge of the widest footing reach, behind you.
  const jib = { at: { x: 0, z: 5 }, run() {} },
    lever = (r: number) => ({ at: { x: 0, z: -0.01 }, r, run() {} });
  const carrying = lever(-LEVER_YIELD);
  assert.equal(pickInteract([carrying, jib], 0, 0, 0, -1), jib);
  assert.ok(LEVER_YIELD > 5 + 2 * FACING);
  // Alone in reach it still answers.
  assert.equal(pickInteract([carrying], 0, 0, 0, -1), carrying);
  const free = lever(0);
  assert.equal(pickInteract([free, jib], 0, 0, 0, -1), free);
});
