// R4c, the leaf (docs/plans/ring-island-build1.md, step 4c): the leaf's pose over time (src/entities/railway/leaf-shape.ts),
// driven by the Aperture row's brace, counterweight and rivet as leaf-view.ts reads them. Raised before the join, dipping
// a quarter per hung footing once braced, swinging down in 2.5 s with one landing, flat after; a view that first reads
// a joined world (a late joiner) is flat at once.
//
// With more than one player (the P1 of 11 November), the real view (`createRailwayLeaf`, run from its own source as
// test/railway-station-seats.test.ts does, since the views need a DOM at import) on each page of a room with the
// server's real requests and a real adapter per player at 0-200 ms: the brace from one player and the counterweight from
// another in either order and in a same-moment race; a player under the toe as seen on their own page and as drawn on the
// others' (remotes are presence poses with no body for the leaf to hit, drawn INTERP_MS late); a page joining
// mid-swing; a landed leaf staying down while the pending window is full or the link is down.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { sourceFunction } from '../dev/level/source.ts';
import { createRailwayAdapter, railMovement } from '../src/adapters/railway-session.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { BRACE as SIM_BRACE } from '../src/sim/railway-sys-ring.ts';
import { RING_BRACE, RING_GAP, ringDeckY } from '../src/sim/railway-ring-layout.ts';
import { INTERP_MS, PLAYER_R, SEND_MS } from '../src/constants.ts';
import { RING_S, line2World, line2Y } from '../src/entities/railway/line2-path.ts';
import * as shape from '../src/entities/railway/leaf-shape.ts';
import { homeLand } from './helpers/land.ts';

const {
  BRACE,
  DIP_S,
  LEAF_UP,
  SWING_S,
  TOE_MARGIN,
  TOE_SPEED,
  TOE_U,
  braceOffered,
  createLeafMotion,
  jibOffered,
  jibVerb,
  leafRest,
  toeShove,
} = shape;

const DT = 1 / 60;
/** Runs `s` seconds toward `rest`; returns the degrees seen each frame and the frames that reported a landing. */
function run(m: ReturnType<typeof createLeafMotion>, rest: number, s: number) {
  const degs: number[] = [];
  let landings = 0;
  m.aim(rest);
  for (let t = 0; t < s; t += DT) {
    if (m.step(DT)) landings++;
    degs.push(m.deg);
  }
  return { degs, landings };
}

test("the view's brace encoding is the sim's", () => assert.deepEqual(BRACE, SIM_BRACE));

test('the rests: raised on the pawl, a quarter per footing once braced, down on the last or the rivet', () => {
  assert.equal(leafRest(1, 0, -1), LEAF_UP);
  assert.equal(leafRest(1, 4, -1), LEAF_UP, 'four hung but the pawl still in');
  for (let k = 0; k < 4; k++) assert.equal(leafRest(2, k, -1), (LEAF_UP * (4 - k)) / 4);
  assert.equal(leafRest(0, 4, -1), 0);
  assert.equal(leafRest(2, 0, 100), 0, 'a struck rivet means down whatever the rows say');
});

test("the seeds' rows give the rests the plan names", () => {
  const raised = aperture(railwayAtRing('leaf-raised').w);
  assert.equal(leafRest(raised.brace, raised.cw, raised.joined), LEAF_UP);
  const joined = aperture(railwayAtRing('ring-joined').w);
  assert.equal(leafRest(joined.brace, joined.cw, joined.joined), 0);
});

test('raised before the join, swinging 2.5 s ease-in with one landing, flat after', () => {
  const m = createLeafMotion();
  const before = run(m, LEAF_UP, 3);
  assert.ok(before.degs.every((d) => d === LEAF_UP) && before.landings === 0, 'raised and still before the join');
  const { degs, landings } = run(m, 0, SWING_S + 1);
  assert.equal(landings, 1, 'one landing');
  const at = (s: number) => degs[Math.round(s / DT) - 1]!;
  assert.ok(at(0.5) > LEAF_UP * 0.9, 'slow to start (ease-in)');
  assert.ok(at(SWING_S / 2) > LEAF_UP * 0.7 && at(SWING_S / 2) < LEAF_UP * 0.8, 'a quarter of the way at the half');
  for (let i = 1; i < degs.length; i++) assert.ok(degs[i]! <= degs[i - 1]!, 'never rising on the way down');
  assert.equal(at(SWING_S + 0.1), 0, 'flat after the 2.5 s');
  assert.equal(degs.at(-1), 0);
  const again = run(m, 0, 1);
  assert.deepEqual([again.landings, again.degs.at(-1)], [0, 0], 'no second landing');
});

test('braced footings dip it a quarter each without a landing, then the last swings it down', () => {
  const m = createLeafMotion();
  for (let k = 1; k <= 3; k++) {
    const r = run(m, leafRest(2, k, -1), DIP_S + 0.1);
    assert.equal(r.landings, 0);
    assert.equal(m.deg, (LEAF_UP * (4 - k)) / 4);
  }
  assert.equal(run(m, 0, SWING_S + 0.1).landings, 1);
});

test('a late joiner after the join sees it flat at once, with no swing', () => {
  const m = createLeafMotion();
  m.snap(leafRest(0, 4, 100));
  assert.equal(m.deg, 0);
  assert.equal(m.moving, false);
  const r = run(m, leafRest(0, 4, 100), 1);
  assert.deepEqual([r.landings, r.degs[0], r.degs.at(-1)], [0, 0, 0]);
});

test('the brace prompt is offered exactly once the gap is footed with the pawl in, and at no other state', () => {
  for (let set = 0; set <= 14; set++)
    for (let brace = 0; brace <= 2; brace++)
      assert.equal(braceOffered(set, brace), set === 14 && brace === 1, `set ${set} brace ${brace}`);
});

test("the jib's prompt is the bent's footing, then a counterweight footing until four hang, then none", () => {
  for (let set = 0; set <= 14; set++)
    for (let cw = 0; cw <= 4; cw++) assert.equal(jibOffered(set, cw), set < 14 || cw < 4, `set ${set} cw ${cw}`);
});

test('at each ring seed the windows are the plan names', () => {
  const at = (stage: Parameters<typeof railwayAtRing>[0]) => aperture(railwayAtRing(stage).w);
  const deck = at('deck-laid'),
    gap = at('gap-footed'),
    leaf = at('leaf-raised'),
    joined = at('ring-joined');
  assert.deepEqual([braceOffered(deck.set, deck.brace), jibOffered(deck.set, deck.cw)], [false, true], 'deck-laid');
  assert.deepEqual([braceOffered(gap.set, gap.brace), jibOffered(gap.set, gap.cw)], [true, true], 'gap-footed');
  assert.deepEqual([braceOffered(leaf.set, leaf.brace), jibOffered(leaf.set, leaf.cw)], [true, true], 'leaf-raised');
  assert.deepEqual(
    [braceOffered(joined.set, joined.brace), jibOffered(joined.set, joined.cw)],
    [false, false],
    'joined',
  );
});

test('the toe shove: only under the landing, only while the leaf is coming down, walking back and never up', () => {
  const deg = 20;
  assert.equal(toeShove(259.5, 0, deg, true), TOE_SPEED, 'under the toe');
  assert.equal(toeShove(258.7, 0, deg, true), TOE_SPEED, 'inside the margin');
  assert.equal(toeShove(258.5, 0, deg, true), 0, 'clear of it');
  assert.equal(toeShove(255, 0, deg, true), 0, 'the deck end is not touched');
  assert.equal(toeShove(262, 0, deg, true), 0, 'on the plate stays put');
  assert.equal(toeShove(259.5, 0, 70, true), 0, 'the leaf is still high');
  assert.equal(toeShove(259.5, 0, 0, false), 0, 'settled: someone stepping onto the plate is left alone');
  assert.equal(toeShove(259.5, 8, deg, true), 0, 'in the air above is not the deck');
  // A counterweight's dip (39 to 19.5 degrees) moves the leaf but is not its landing: nobody under the toe is walked.
  const dip = createLeafMotion(39);
  dip.aim(19.5);
  dip.step(DIP_S / 2);
  assert.deepEqual([dip.moving, dip.falling], [true, false]);
  assert.equal(toeShove(259.5, 0, dip.deg, dip.falling), 0, 'a dip is not the landing');
  // Walked at its speed through the swing, anyone from the toe's edge is clear before it lands.
  const m = createLeafMotion();
  m.aim(0);
  let u = 260.9;
  for (let t = 0; t < SWING_S + 0.2; t += DT) {
    m.step(DT);
    u -= toeShove(u, 0, m.deg, m.falling) * DT;
  }
  assert.ok(u <= TOE_U - 1, `cleared to ${u.toFixed(2)}`);
});

test("the jib's words: a bent's footing until the gap is footed, then the owner's counterweight label", () => {
  assert.equal(jibVerb(13), 'Set the footing');
  assert.equal(jibVerb(14), 'Hang the weight');
});

// ---------------------------------------------------------------- the real view on each page of a room
type Leaf = {
  update(dt: number): void;
  restore(): void;
  inspect(): { leafView: { deg: number; moving: boolean } };
};
type Body = { position: { x: number; y: number; z: number } };
/** One page's leaf view from its own source: its own `me`, pose and thump, the rest as the module imports them. */
function leafView(adapter: unknown, me: { body: Body | null }, pose: { leaf: number }, thump: () => void) {
  const create = sourceFunction<(adapter: unknown) => Leaf>('src/entities/railway/leaf-view.ts', 'createRailwayLeaf', {
    THREE,
    me,
    thump,
    RING_BRACE,
    RING_GAP,
    aperture,
    line2Trains,
    ringIslandPose: pose,
    line2World,
    RING_S,
    line2Y,
    ...shape,
  });
  return create(adapter);
}

const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });
const STEP_MS = 1000 / 60 + 1;
const STEP_S = STEP_MS / 1000;
const TOE_DECK = line2Y(RING_S + TOE_U);
/** A player's body standing on the line at `u` m (feet on the toe's deck). */
function bodyAt(u: number): Body {
  const p = { x: 0, z: 0 };
  line2World(RING_S + u, 0, p);
  return { position: { x: p.x, y: TOE_DECK + 0.45, z: p.z } };
}
/** Metres along the line of a body (the toe's straight run). */
function uOf(b: Body) {
  const a = { x: 0, z: 0 },
    c = { x: 0, z: 0 };
  line2World(RING_S + TOE_U, 0, a);
  line2World(RING_S + TOE_U - 1, 0, c);
  return TOE_U - ((b.position.x - a.x) * (c.x - a.x) + (b.position.z - a.z) * (c.z - a.z));
}

type Page = {
  pid: string;
  adapter: ReturnType<typeof createRailwayAdapter>;
  leaf: Leaf;
  me: { body: Body | null };
  pose: { leaf: number; bracket: number; braced: boolean };
  /** Thumps (landings) this page's leaf played, and its degrees each step. */
  landings: number;
  degs: number[];
  corrections: { op: string; reason: string }[];
};

/** A room at a seed with the server's real requests; every action is in reach (the host test judges reach). */
function room(stage: 'leaf-raised' | 'ring-joined' = 'leaf-raised') {
  const seed = railwayAtRing(stage);
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  while (sync.world.tick <= seed.t) sync.stepWorld(100);
  api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  api.touchAll();
  const pages = new Map<string, Page>();
  const delays = new Map<string, number>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  let step = 0,
    now = 1000;
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => pages.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (delays.get(m.to) ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  function join(pid: string, delay: number, body: Body | null = null) {
    const cid = pid;
    delays.set(cid, delay);
    const hs = new Set<(m: unknown, from: string) => void>();
    handlers.set(cid, hs);
    const adapter = createRailwayAdapter({
      mirror: createRailwayMirror(),
      movement: () => MOVEMENT,
      pid,
      pose: () => ({ x: 0, y: 0, z: 0 }),
      now: () => now,
    });
    const me = { body },
      pose = { leaf: LEAF_UP, bracket: 0, braced: false };
    const p: Page = {
      pid,
      adapter,
      me,
      pose,
      leaf: null as unknown as Leaf,
      landings: 0,
      degs: [],
      corrections: [],
    };
    p.leaf = leafView(adapter, me, pose, () => void p.landings++);
    const r: WorldRoom = {
      selfId: cid,
      send: (m) => void up.push({ at: step + delay, cid, m }),
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: () => () => {},
    };
    adapter.onCorrected((x) => p.corrections.push({ op: x.event.op, reason: x.reason }));
    pages.set(cid, p);
    replication.addClient(cid);
    adapter.attach(r);
    return p;
  }
  function run(n = 1) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        requests.receive(x.m, x.cid);
      }
      sync.stepWorld(STEP_MS);
      now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (cid, _p, json) =>
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const cid of pages.keys())
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const p of pages.values()) {
        p.adapter.update(now);
        p.leaf.update(STEP_S);
        p.degs.push(p.pose.leaf);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...pages.values()].every((p) => p.adapter.read.ready()); k++) run();
    assert.ok(
      [...pages.values()].every((p) => p.adapter.read.ready()),
      'every page ready',
    );
  };
  const server = () => ({ ...aperture(api.world()) });
  return { api, join, run, ready, server, pages, step: () => step };
}
type Room = ReturnType<typeof room>;

/** One footing from the railhead rack to the jib by `p` (both predicted; the cadence is the unload's 90 ms). */
function hang(r: Room, p: Page) {
  assert.equal(p.adapter.shoulderFooting(2), true, `${p.pid} shoulders a footing`);
  r.run(8);
  assert.equal(p.adapter.setFooting(3), true, `${p.pid} sets it at the jib`);
  r.run(8);
}
/** Every page agrees with the server's row, has nothing pending, and has its leaf at rest at the row's pose. */
function settled(r: Room, label: string) {
  r.run(200);
  const s = r.server();
  for (const p of r.pages.values()) {
    assert.equal(p.adapter.read.pending(), 0, `${label}: ${p.pid} has nothing pending`);
    const a = aperture(p.adapter.read.world());
    assert.deepEqual(
      [a.set, a.rack, a.cw, a.brace, a.joined],
      [s.set, s.rack, s.cw, s.brace, s.joined],
      `${label}: ${p.pid} mirrors the row`,
    );
    assert.equal(p.leaf.inspect().leafView.moving, false, `${label}: ${p.pid}'s leaf at rest`);
    assert.equal(p.pose.leaf, leafRest(s.brace, s.cw, s.joined), `${label}: ${p.pid}'s leaf at the row's pose`);
  }
  return s;
}

test('two players: the brace from one, the counterweight from the other, brace first: down once on both pages', () => {
  const r = room();
  const alice = r.join('alice', 6),
    bob = r.join('bob', 3);
  r.ready();
  assert.deepEqual([r.server().set, r.server().rack, r.server().cw, r.server().brace], [14, 4, 0, 1]);
  assert.equal(alice.adapter.braceLeaf(), true, 'alice knocks out the pawl');
  assert.equal(settled(r, 'braced').brace, 2, 'braced by alice');
  for (let k = 1; k <= 4; k++) hang(r, bob);
  const s = settled(r, 'down');
  assert.deepEqual([s.cw, s.brace, s.rack], [4, 0, 0], "down on bob's fourth");
  assert.equal(r.api.account('alice')!.request, 1, "alice's one action");
  assert.equal(r.api.account('bob')!.request, 8, "bob's four carries");
  for (const p of [alice, bob]) {
    assert.equal(p.landings, 1, `${p.pid}: one landing`);
    assert.deepEqual(p.corrections, [], `${p.pid}: nothing corrected`);
  }
});

test('two players: the counterweight hung first by one, the brace by the other: down once on both pages', () => {
  const r = room();
  const alice = r.join('alice', 6),
    bob = r.join('bob', 3);
  r.ready();
  for (let k = 1; k <= 4; k++) hang(r, bob);
  const hung = settled(r, 'hung');
  assert.deepEqual([hung.cw, hung.brace], [4, 1], 'four hung, the pawl still in');
  assert.ok(
    [alice, bob].every((p) => p.degs.every((d) => d === LEAF_UP)),
    'the leaf never moves on the pawl',
  );
  assert.equal(alice.adapter.braceLeaf(), true);
  const s = settled(r, 'down');
  assert.deepEqual([s.cw, s.brace], [4, 0], "down on alice's brace");
  for (const p of [alice, bob]) {
    assert.equal(p.landings, 1, `${p.pid}: one landing`);
    assert.deepEqual(p.corrections, [], `${p.pid}: nothing corrected`);
  }
});

for (const [first, aliceDelay, bobDelay] of [
  ['the brace', 3, 9],
  ['the fourth footing', 9, 3],
] as const)
  test(`a race: the brace and the fourth footing pressed together, ${first} arriving first; both pages end down`, () => {
    const r = room();
    const alice = r.join('alice', aliceDelay),
      bob = r.join('bob', bobDelay);
    r.ready();
    for (let k = 1; k <= 3; k++) hang(r, bob);
    assert.equal(bob.adapter.shoulderFooting(2), true);
    settled(r, 'three hung');
    // Pressed on the same step; whichever is nearer the server lands first.
    assert.equal(alice.adapter.braceLeaf(), true);
    assert.equal(bob.adapter.setFooting(3), true);
    const at = r.step();
    const s = settled(r, 'down');
    assert.deepEqual([s.cw, s.brace], [4, 0], 'down');
    assert.equal(r.api.account('alice')!.request, 1);
    assert.equal(r.api.account('bob')!.request, 8);
    for (const p of [alice, bob]) {
      assert.equal(p.landings, 1, `${p.pid}: one landing`);
      assert.deepEqual(p.corrections, [], `${p.pid}: nothing corrected`);
      // The leaf starts down only once that page knows both: never a dip and back up.
      const after = p.degs.slice(at);
      for (let i = 1; i < after.length; i++) assert.ok(after[i]! <= after[i - 1]!, `${p.pid}: never rising`);
    }
  });

test('a page that joins mid-swing snaps to the landed leaf: no swing, no landing, no thump', () => {
  const r = room();
  const alice = r.join('alice', 6),
    bob = r.join('bob', 3);
  r.ready();
  for (let k = 1; k <= 4; k++) hang(r, bob);
  settled(r, 'hung');
  assert.equal(alice.adapter.braceLeaf(), true);
  for (let k = 0; k < 200 && !alice.leaf.inspect().leafView.moving; k++) r.run();
  r.run(60); // a second into alice's swing
  assert.ok(alice.leaf.inspect().leafView.moving && alice.pose.leaf > 0, 'alice mid-swing');
  const erin = r.join('erin', 6);
  r.run(200);
  const changes = erin.degs.filter((d, i) => i > 0 && erin.degs[i - 1] !== d);
  assert.deepEqual(
    [erin.landings, erin.pose.leaf, changes],
    [0, 0, [0]],
    'erin: the placeholder (raised) while loading, then flat from the first ready frame, never in between',
  );
  settled(r, 'down');
});

test('a landed leaf stays down while the pending window is full or the link is down', () => {
  // The reviewer's case (review/leaf-coop): read.ready() is also false with RAILWAY_WINDOW actions pending or the link
  // down, and the world the views see is the same joined world; the view reads the session's latch, read.whole(), which stays true (and ready() is not read).
  const w = railwayAtRing('ring-joined').w;
  let ready = true,
    thumps = 0;
  const pose = { leaf: 78, bracket: 0, braced: false };
  const leaf = leafView(
    { read: { world: () => w, whole: () => true, ready: () => ready }, braceLeaf: () => true },
    { body: null },
    pose,
    () => void thumps++,
  );
  for (let k = 0; k < 30; k++) leaf.update(1 / 60);
  assert.equal(pose.leaf, 0, 'down at the joined seed');
  ready = false;
  const seen: number[] = [];
  for (let k = 0; k < 120; k++) {
    leaf.update(1 / 60);
    seen.push(pose.leaf);
  }
  ready = true;
  for (let k = 0; k < 240; k++) {
    leaf.update(1 / 60);
    seen.push(pose.leaf);
  }
  assert.deepEqual([Math.max(...seen), thumps], [0, 0], 'never raised, never landed again');
});

// ---------------------------------------------------------------- a third player at the toe, a fourth on the deck
const HINGE_U = RING_GAP.hinge / 100,
  HINGE_Y = ringDeckY(RING_GAP.hinge) / 100,
  TOE_DECK_Y = ringDeckY(Math.round(TOE_U * 100)) / 100,
  GAP = RING_GAP.leaf / 100;
/** Head height over the deck of a standing player (Buddy's capsule top, generously). */
const BODY_H = 1.8;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Whether the leaf's plate (0.8 m thick, hinged at HINGE_U, GAP m to its toe) is inside a player standing on the toe's
 * deck at `u` (PLAYER_R either side along the line, feet on the deck, head BODY_H up): over the body's span the plate's
 * slab reaches below the head and above the feet. The plate at `hd` m from the hinge (horizontally) stands
 * `hd * tan(deg)` over the hinge, out to its toe at `GAP * cos(deg)`. A landed plate lies below the toe deck's top. */
function plateHits(u: number, deg: number) {
  const r = rad(deg),
    reach = GAP * Math.cos(r),
    near = HINGE_U - (u + PLAYER_R),
    far = Math.min(HINGE_U - (u - PLAYER_R), reach);
  if (near > reach || far < 0) return false;
  const feet = TOE_DECK_Y - HINGE_Y,
    low = Math.max(0, near) * Math.tan(r) - 0.8 / Math.cos(r),
    high = far * Math.tan(r);
  return low < feet + BODY_H && high > feet;
}
/** The steps a remote's pose is behind on another page: its uplink and the viewer's downlink (the server relays
 * presence), half a send period on average, then INTERP_MS of interpolation. */
const behind = (from: number, to: number) => from + to + Math.round((SEND_MS / 2 + INTERP_MS) / STEP_MS);

// At 35 degrees the first failed (drawn inside the plate for about 160 ms on the others' pages); the second is the
// last-quarter swing that follows the counterweight's dips, which must not walk anyone.
for (const [order, braceLast] of [
  ['the brace last (a 78 degree swing)', true],
  ['the weight last (the last quarter)', false],
] as const)
  test(`a third player at the toe's far edge and a fourth on the deck as the leaf lands, ${order}`, () => {
    const r = room();
    const startU = TOE_U + 0.9,
      deckU = TOE_U - TOE_MARGIN - 1.5;
    // Alice braces, bob hangs, carol stands under the toe and dave on the deck; 0 to 200 ms one way. Each page moves
    // only its own player (leaf-view.ts `shove`, me.body).
    const alice = r.join('alice', 6),
      bob = r.join('bob', 3),
      carol = r.join('carol', 12, bodyAt(startU)),
      dave = r.join('dave', 0, bodyAt(deckU));
    const carolU = uOf(carol.me.body!),
      daveU = uOf(dave.me.body!);
    r.ready();
    if (!braceLast) {
      assert.equal(alice.adapter.braceLeaf(), true);
      settled(r, 'braced');
    }
    for (let k = 1; k <= 3; k++) hang(r, bob);
    assert.equal(bob.adapter.shoulderFooting(2), true);
    settled(r, 'ready to land');
    assert.equal(uOf(carol.me.body!), carolU, 'the dips walked nobody');
    if (braceLast) {
      assert.equal(bob.adapter.setFooting(3), true);
      r.run(40);
      assert.equal(alice.adapter.braceLeaf(), true);
    } else assert.equal(bob.adapter.setFooting(3), true);
    const mark = new Map([...r.pages.values()].map((p) => [p, p.degs.length]));
    const trace = new Map<Page, number[]>([
      [carol, []],
      [dave, []],
    ]);
    for (let k = 0; k < 400; k++) {
      r.run();
      for (const [p, us] of trace) us.push(uOf(p.me.body!));
    }
    const s = settled(r, 'down');
    assert.deepEqual([s.cw, s.brace], [4, 0]);
    // On their own pages: never inside the plate, still on bent 13's deck, the one on the deck never moved.
    for (const [p, us] of trace) {
      const degs = p.degs.slice(mark.get(p));
      const hit = us.findIndex((u, i) => plateHits(u, degs[i]!));
      assert.equal(hit, -1, `${p.pid} on their own page: inside the plate at frame ${hit}`);
      assert.ok(us.at(-1)! > TOE_U - TOE_MARGIN - 2, `${p.pid} still on the deck (u ${us.at(-1)!.toFixed(2)})`);
    }
    assert.ok(
      trace.get(dave)!.every((u) => u === daveU),
      'the one on the deck is never moved',
    );
    assert.ok(uOf(carol.me.body!) < TOE_U - PLAYER_R, 'carol walked clear of the toe');
    // On each other page: carol drawn where her presence says, late by `behind`; never inside that page's plate.
    const late: string[] = [];
    for (const [viewer, d] of [
      [alice, 6],
      [bob, 3],
      [dave, 0],
    ] as const) {
      const lag = behind(12, d);
      const us = trace.get(carol)!,
        degs = viewer.degs.slice(mark.get(viewer));
      let frames = 0;
      for (let i = 0; i < us.length; i++) if (plateHits(us[Math.max(0, i - lag)]!, degs[i]!)) frames++;
      if (frames) late.push(`${viewer.pid}: ${Math.round(frames * STEP_MS)} ms`);
    }
    assert.deepEqual(late, [], "carol's avatar drawn inside the plate on others' pages");
  });
