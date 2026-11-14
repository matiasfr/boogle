// Right-hand platform authority (running-side step 3). Physical sides are named independently of tuple order;
// validate the server's reach check and then the unchanged request rule against played seed worlds.
import { railPlatformEnd } from '../src/sim/railway-queries-trains.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_HALTS, haltPlatform, type RailPlatform } from '../src/sim/railway-lines.ts';
import { RING_FORMATION, RING_HALT, RING_HEAD, RING_JOINT_UP } from '../src/sim/railway-ring-layout.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { act, buildSeedWorld, railTick, restore, type Seed, type SeedStage } from './helpers/rail.ts';

// Build each played fixture once, outside individual validation tests (as in railway-install.test.ts).
const stages = ['trains-on', 'q6-done', 'deck-laid', 'leaf-raised', 'ring-joined', 'gorge-mid'] as const;
const seeds = new Map<SeedStage, Seed>(stages.map((stage) => [stage, buildSeedWorld(stage)]));
const at = (stage: SeedStage): Seed => {
  const s = seeds.get(stage)!;
  return { w: restore(s.w), t: s.t };
};

const idOf = (name: string) => {
  const id = RAIL_HALTS.findIndex((h) => h.name === name);
  assert.ok(id >= 0, name);
  return id;
};
const actorAt = (p: RailPlatform): Actor => ({
  reach: (x, z, r) => (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) <= r * r,
  height: (y, r) => Math.abs(p.y - y) <= r,
  cadence: () => true,
});
const valid = (s: Seed, name: string, dir: -1 | 1, p: RailPlatform) =>
  railValid(s.w, { op: 'rail.call', id: idOf(name), dir, epoch: 0, request: 0 }, actorAt(p), s.t);
const ask = (s: Seed, name: string, dir: -1 | 1, p: RailPlatform) =>
  valid(s, name, dir, p) && act(s, 'a', 'rail.call', { id: idOf(name), dir }) === 1;

const quarrySouth = { x: 108132, z: 4114, y: 2502, reach: 1160 },
  quarryNorth = { x: 106912, z: 3135, y: 2502, reach: 1160 },
  farEast = { x: 136361, z: -16353, y: 2502, reach: 1260 },
  farWest = { x: 135850, z: -17195, y: 2502, reach: 1260 };

test('a pier-bound ask at the Quarry is accepted from the south platform and refused from the north', () => {
  const s = at('trains-on');
  assert.equal(ask(s, 'Quarry', 1, quarrySouth), true);
  assert.equal(valid(s, 'Quarry', 1, quarryNorth), false);
});

test('a Village ask at the Quarry is accepted from the north platform and refused from the south', () => {
  const s = at('trains-on');
  assert.equal(ask(s, 'Quarry', -1, quarryNorth), true);
  assert.equal(valid(s, 'Quarry', -1, quarrySouth), false);
  assert.equal(valid(s, 'Quarry', -1, { ...quarryNorth, y: quarryNorth.y + 301 }), false);
});

test('Far Head uses the east platform at the end, then east outbound and west homeward after Q6', () => {
  const end = at('trains-on');
  assert.equal(ask(end, 'Far Head', -1, farEast), true);
  assert.equal(ask(end, 'Far Head', 1, farEast), false, 'the rule still refuses the way into an end');
  const middle = at('q6-done');
  // The seeded Far Head departure still owns the old side at Q6 completion. Test normal middle service after it clears.
  for (let n = 0; railPlatformEnd(middle.w, 1, 2, middle.t); n++) {
    assert.ok(n < 1000, 'the retained Far Head departure clears');
    railTick(middle.w, ++middle.t);
  }
  assert.equal(ask(middle, 'Far Head', 1, farEast), true);
  assert.equal(ask(middle, 'Far Head', -1, farWest), true);
  // Reach circles overlap at the centres. Pin the selected platform too, without claiming side-exclusive bounds.
  assert.equal(haltPlatform(idOf('Far Head'), -1, 0, true), RAIL_HALTS[idOf('Far Head')]!.platforms[0]);
  assert.deepEqual(haltPlatform(idOf('Far Head'), -1), farWest);
});

test('the Railhead uses its moving east platform before the rivet and the west joint for homeward asks after it', () => {
  for (const [stage, head] of [
    ['deck-laid', 0],
    ['leaf-raised', 7],
  ] as const) {
    const s = at(stage);
    assert.equal(ask(s, 'Railhead', -1, RING_HEAD[head]!.platform), true, stage);
    assert.equal(ask(s, 'Railhead', 1, RING_HEAD[head]!.platform), false, 'no onward departure before the rivet');
    assert.equal(valid(s, 'Railhead', -1, RING_HEAD[head === 0 ? 7 : 0]!.platform), false, 'not at a stale head');
    assert.equal(ask(s, 'Ring Island', -1, RING_HALT.down), false, 'island closed before the rivet');
  }
  const s = at('ring-joined');
  assert.equal(ask(s, 'Railhead', 1, RING_HEAD[7]!.platform), true);
  assert.equal(ask(s, 'Railhead', -1, RING_JOINT_UP), true);
  // Like Far Head, these reach circles overlap; their outer reach edges distinguish the selected centres.
  const east = { ...RING_HEAD[7]!.platform, x: RING_HEAD[7]!.platform.x + 1000 },
    west = { ...RING_JOINT_UP, x: RING_JOINT_UP.x - 1000 };
  assert.equal(valid(s, 'Railhead', 1, east), true);
  assert.equal(valid(s, 'Railhead', -1, east), false);
  assert.equal(valid(s, 'Railhead', -1, west), true);
  assert.equal(valid(s, 'Railhead', 1, west), false);
});

test('Ring Island uses east as the end after the rivet, then east outbound and west homeward when the leg grows', () => {
  const end = at('ring-joined');
  assert.equal(ask(end, 'Ring Island', -1, RING_HALT.down), true);
  assert.equal(ask(end, 'Ring Island', 1, RING_HALT.down), false);
  const middle = at('gorge-mid');
  assert.equal(ask(middle, 'Ring Island', 1, RING_HALT.down), true);
  assert.equal(ask(middle, 'Ring Island', -1, RING_HALT.up), true);
  assert.equal(haltPlatform(idOf('Ring Island'), -1, 0, true), RING_HALT.down);
  assert.equal(haltPlatform(idOf('Ring Island'), -1), RING_HALT.up);
});

test('ring tracks keep their physical locations and assign the original track to outbound', () => {
  assert.deepEqual(RING_FORMATION.tracks, [0, -400]);
  assert.deepEqual([RING_FORMATION.left, RING_FORMATION.right, RING_FORMATION.mid], [-580, 180, -200]);
});

test('the Pier keeps homeward service on its boarding side when Q7 opens the Railhead', () => {
  const east = { x: 140549, z: -35859, y: 2502, reach: 1260 },
    west = { x: 139565, z: -35815, y: 2502, reach: 1260 };
  assert.deepEqual(haltPlatform(idOf('Pier'), -1, 0, true), east, 'the terminal still boards east before Q7');
  assert.equal(ask(at('q6-done'), 'Pier', -1, east), true);
  assert.deepEqual(haltPlatform(idOf('Pier'), -1), west, 'after Q7 the homeward track boards west');
  const s = at('deck-laid');
  assert.equal(ask(s, 'Pier', -1, west), true);
  assert.equal(ask(s, 'Pier', 1, east), false, 'outbound trains still pass the Pier');
  // The centres' reach circles overlap; their outer edges distinguish which platform the server accepts.
  assert.equal(valid(s, 'Pier', -1, { ...west, x: west.x - 1000 }), true);
  assert.equal(valid(s, 'Pier', -1, { ...east, x: east.x + 1000 }), false);
});
