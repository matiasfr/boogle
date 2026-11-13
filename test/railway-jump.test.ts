// The jump-in catalog (docs/plans/playtest-jump-in.md): every row a buildable seed, in route order, and room names the
// shared world can never match.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimCountsIn,
  isJumpWorld,
  JUMPS,
  MENU_JUMPS,
  JUMP_ROOM_RE,
  jumpRoomName,
  jumpOf,
  OFFERED_STAGES,
} from '../src/world/railway-jump.ts';
import { SEED_STAGES, TRAIN_STAGES } from '../src/sim/railway-seeds.ts';
import { WORKS_STAGES } from '../src/sim/railway-seed-works.ts';
import { RING_STAGES } from '../src/sim/railway-seed-ring.ts';
import { STEEL_STAGES } from '../src/sim/railway-seed-steel.ts';
import { LEG_STAGES } from '../src/sim/railway-seed-legs.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../src/world/railway-namespace.ts';
import { DEFAULT_ROOM } from '../src/constants.ts';

const seeds: readonly string[] = SEED_STAGES;

test('jump-in rows are unique, buildable and in route order', () => {
  assert.equal(new Set(JUMPS.map((j) => j.stage)).size, JUMPS.length);
  assert.equal(new Set(JUMPS.map((j) => j.label)).size, JUMPS.length);
  assert.equal(JUMPS[0]!.stage, 'start');
  for (const j of JUMPS) assert.ok(j.stage === 'start' || seeds.includes(j.stage), j.stage);
  const order = OFFERED_STAGES.map((s) => seeds.indexOf(s));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
});

// Deliberate menu admission, independent of SEED_STAGES: a new buildable stage is not an automatic jump-in.
test('the complete Jump in menu is pinned stage by stage', () => {
  const menu = [
    'start',
    'awake',
    'q1-done',
    'hook-taken',
    'hook-earned',
    'q4-done',
    'q5-done',
    'glide-earned',
    'trains-on',
    'freight-running',
    'fares-running',
    'q6-done',
    'works-open',
    'crossing-finishing',
    'crossing-done',
    'deck-laid',
    'gap-footed',
    'ring-joined',
    'steel-kit',
    'steel-lit',
    'steel-home',
    'boiler-long',
  ];
  assert.deepEqual(
    MENU_JUMPS.map((j) => j.stage),
    menu,
  );
});

test('the seed catalog holds every train, works, ring, steel and leg stage', () => {
  assert.equal(new Set(seeds).size, seeds.length);
  for (const s of [...TRAIN_STAGES, ...WORKS_STAGES, ...RING_STAGES, ...STEEL_STAGES, ...LEG_STAGES])
    assert.ok(seeds.includes(s), s);
});

test('jump room names stay readable and never match the shared room', () => {
  for (const stage of ['start', ...seeds]) {
    const name = jumpRoomName(stage, 'abc123');
    assert.match(name, JUMP_ROOM_RE, stage);
    assert.ok(name.length <= 22, name);
    assert.equal(railwayRoomId(name), `${RAILWAY_PLAY_NS}-${name}`);
  }
  assert.equal(JUMP_ROOM_RE.test(DEFAULT_ROOM), false);
});

test("a crate opened in a jump room dresses you only there, and a jump room's wardrobe starts empty", () => {
  const shared = railwayRoomId(DEFAULT_ROOM);
  const jump = railwayRoomId(jumpRoomName('hook-earned', 'k3x9qa'));
  const other = railwayRoomId(jumpRoomName('q1-done', 'a1b2c3'));
  const family = railwayRoomId('sundays'); // a hand-named room, not a jump room's shape
  assert.ok(isJumpWorld(jump));
  assert.ok(!isJumpWorld(shared));
  assert.ok(!isJumpWorld(family));
  assert.ok(claimCountsIn(jump, jump), 'the jump room keeps its own hat');
  assert.ok(!claimCountsIn(jump, shared), 'no hat in the shared world from a test room');
  assert.ok(!claimCountsIn(jump, other));
  assert.ok(!claimCountsIn(shared, jump), "the shared world's hat isn't in a test room");
  assert.ok(claimCountsIn(shared, family), 'between ordinary rooms a claim counts, as before');
  assert.ok(claimCountsIn(family, shared));
});

test('the crossing almost finished is a jump-in, landing by the pier rack as the crossing built does', () => {
  const finishing = JUMPS.find((j) => j.stage === 'crossing-finishing');
  assert.ok(finishing && OFFERED_STAGES.includes('crossing-finishing'));
  assert.deepEqual(finishing.land, JUMPS.find((j) => j.stage === 'crossing-done')!.land);
});

test("the Pier's landings stand on the east platform's south end, facing the crossing (call 57, v27)", async () => {
  const { LINKS, ORIGIN, lineAt, railY } = await import('../src/place/layout.ts');
  const q = { x: 0, z: 0, ux: 0, uz: 0 };
  lineAt(LINKS[1]!.line, 720.5, q);
  const at = { x: ORIGIN.x + q.x - q.uz * 2.9, z: ORIGIN.z + q.z + q.ux * 2.9 };
  for (const stage of ['q6-done', 'crossing-finishing', 'crossing-done', 'deck-laid']) {
    const land = JUMPS.find((j) => j.stage === stage)!.land!;
    assert.ok(Math.hypot(land.x - at.x, land.z - at.z) < 0.05, `${stage}: s 720.5, lat +2.9`);
    assert.ok(Math.abs(land.y - (railY(LINKS[1]!.line, 720.5) + 0.72)) < 0.05, `${stage}: on the platform's deck`);
  }
});

test("the fares-running row lands on line 2's Village platform, where riders board, facing the Quarry (slice 5 R3)", async () => {
  const { RAIL_LINES } = await import('../src/sim/railway-lines.ts');
  const { TRADE } = await import('../src/sim/railway-trade-layout.ts');
  const row = JUMPS.find((j) => j.stage === 'fares-running')!;
  assert.ok(OFFERED_STAGES.includes('fares-running'));
  assert.equal(TRADE.routes[0]!.line, 1, 'riders ride line 2');
  assert.equal(TRADE.routes[0]!.a, 0, "from the line's first halt, the Village");
  const at = RAIL_LINES[1]!.halts[0]!.platforms[0],
    quarry = RAIL_LINES[1]!.halts[1]!.platforms[1];
  const land = row.land!;
  // On the platform's line (line 2, lat +3.1, the island runs s 6 to 28 m), 5 m on from where riders board (s 17), so
  // the station canopy is behind the follow camera.
  const { LINKS, ORIGIN, lineAt } = await import('../src/place/layout.ts');
  const q = { x: 0, z: 0, ux: 0, uz: 0 };
  lineAt(LINKS[1]!.line, 22, q);
  const s22 = { x: ORIGIN.x + q.x - q.uz * 3.1, z: ORIGIN.z + q.z + q.ux * 3.1 };
  assert.ok(Math.hypot(land.x - s22.x, land.z - s22.z) < 0.05, 'on the platform, s 22, lat +3.1');
  assert.ok(Math.hypot(land.x - at.x / 100, land.z - at.z / 100) < 5, 'within 5 m of where riders board');
  assert.ok(Math.abs(land.y - at.y / 100) < 0.01, "on the platform's top");
  // Forward is (-sin yaw, -cos yaw): toward the Quarry.
  const fx = -Math.sin(land.yaw!),
    fz = -Math.cos(land.yaw!);
  const dx = quarry.x / 100 - land.x,
    dz = quarry.z / 100 - land.z;
  assert.ok((fx * dx + fz * dz) / Math.hypot(dx, dz) > 0.999, 'facing the Quarry');
  const order = JUMPS.map((j) => j.stage);
  assert.equal(order.indexOf('fares-running'), order.indexOf('freight-running') + 1, 'right after Timber home');
});

test('the menu lists the rows it always did: the leg 1 stages are tooling, still resolved by ?from=', () => {
  // Pinned: a new stage joins the menu only by an owner's call that edits this list (docs/agents/owner-calls.md).
  assert.equal(MENU_JUMPS.at(-1)!.stage, 'boiler-long');
  assert.equal(MENU_JUMPS.length, JUMPS.length - 2);
  assert.deepEqual(
    JUMPS.filter((j) => !MENU_JUMPS.includes(j)).map((j) => j.stage),
    ['gorge-open', 'gorge-reached'],
  );
  for (const stage of ['gorge-open', 'gorge-reached']) {
    assert.ok(jumpOf(stage)?.land, `${stage} resolves with its landing`);
    assert.ok(OFFERED_STAGES.includes(stage as never), `${stage} stays buildable by ?from=`);
  }
});
