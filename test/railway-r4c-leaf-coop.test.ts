// R4c's leaf with more than one player (docs/plans/ring-island-build1.md, step 4c; the P1 in orchestrator-state's "New
// leftovers, 11 November morning"). Real server rules and requests behind hand-driven rooms at the `leaf-raised` seed,
// a real adapter per player with a one-way delay in steps (6 steps ~ 100 ms), and each page's leaf as leaf-view.ts
// drives it: the rest read from `adapter.read.world()` every frame, `createLeafMotion` stepped at 60 Hz.
//
//   1. One player braces at the strut, another hangs the counterweight: accepted with the two actions from different
//      players, in either order and in a same-moment race in both arrival orders; every page lands the leaf once and
//      ends on the server's Aperture row.
//   2. A third player under the toe and a fourth on the deck as it lands: on their own pages the toe shove walks the
//      one under it clear before the plate reaches head height, and the one on the deck is never moved. On the others'
//      pages a remote is drawn where its presence says, INTERP_MS late, with no body for the leaf to hit (src/netplay:
//      remotes are poses, not colliders), so the question there is only whether the drawn avatar is clear in time.
//      With the shove starting at 35 degrees, a player at the toe's far edge at 200 ms one way was drawn inside the
//      plate on every other page for about 160 ms of a brace-last (78 degree) swing; it starts at 60 now.
//   3. A page that joins mid-swing snaps to the landed leaf (the plate's rest from the row, never a replayed swing).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter, railMovement } from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { RING_GAP, ringDeckY } from '../src/sim/railway-ring-layout.ts';
import { INTERP_MS, PLAYER_R, SEND_MS } from '../src/constants.ts';
import {
  LEAF_UP,
  TOE_MARGIN,
  TOE_U,
  createLeafMotion,
  leafRest,
  toeShove,
} from '../src/entities/railway/leaf-shape.ts';
import { homeLand } from './helpers/land.ts';

const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });
const STEP_MS = 1000 / 60 + 1;
const DT = STEP_MS / 1000;

type Page = {
  pid: string;
  adapter: ReturnType<typeof createRailwayAdapter>;
  motion: ReturnType<typeof createLeafMotion>;
  /** Frames this page's leaf reported a landing, and its degrees each step. */
  landings: number;
  degs: number[];
  seen: boolean;
  corrections: { op: string; reason: string }[];
};

/** A room at a seed with the server's real requests; every action is in reach (the host test judges reach). */
function room() {
  const seed = buildSeedWorld('leaf-raised');
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
  /** leaf-view.ts's `rest()` and `update()`, as written: the row read from the facade each frame, never kept. */
  function frame(p: Page) {
    const wd = p.adapter.read.world();
    const a = p.adapter.read.ready() && line2Trains(wd) ? aperture(wd) : null;
    const rest = a ? leafRest(a.brace, a.cw, a.joined) : LEAF_UP;
    if (!p.seen) {
      p.motion.snap(rest);
      p.seen = p.adapter.read.ready();
    } else {
      p.motion.aim(rest);
      if (p.motion.step(DT)) p.landings++;
    }
    p.degs.push(p.motion.deg);
  }
  function join(pid: string, delay: number) {
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
    const p: Page = { pid, adapter, motion: createLeafMotion(), landings: 0, degs: [], seen: false, corrections: [] };
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
        frame(p);
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
    assert.equal(p.adapter.inspect().pending, 0, `${label}: ${p.pid} has nothing pending`);
    const a = aperture(p.adapter.read.world());
    assert.deepEqual(
      [a.set, a.rack, a.cw, a.brace, a.joined],
      [s.set, s.rack, s.cw, s.brace, s.joined],
      `${label}: ${p.pid} mirrors the row`,
    );
    assert.equal(p.motion.moving, false, `${label}: ${p.pid}'s leaf at rest`);
    assert.equal(p.motion.deg, leafRest(s.brace, s.cw, s.joined), `${label}: ${p.pid}'s leaf at the row's pose`);
  }
  return s;
}

test('two players: the brace from one, the counterweight from the other, brace first: down once on both pages', () => {
  const r = room();
  const alice = r.join('alice', 6),
    bob = r.join('bob', 3);
  r.ready();
  assert.deepEqual([r.server().set, r.server().rack, r.server().cw, r.server().brace], [14, 4, 0, 1]);
  assert.equal(alice.adapter.braceLeaf(), true, 'alice pulls at the strut');
  const braced = settled(r, 'braced');
  assert.equal(braced.brace, 2, 'braced by alice');
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
    r.run(Math.max(aliceDelay, bobDelay));
    // The server took both, from their two players, and the leaf is down either way.
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
  for (let k = 0; k < 200 && !alice.motion.moving; k++) r.run();
  r.run(60); // a second into alice's swing
  assert.ok(alice.motion.moving && alice.motion.deg > 0, 'alice mid-swing');
  const erin = r.join('erin', 6);
  r.run(200);
  const changes = erin.degs.filter((d, i) => i > 0 && erin.degs[i - 1] !== d);
  assert.deepEqual(
    [erin.landings, erin.motion.deg, changes],
    [0, 0, [0]],
    'erin: the placeholder (raised) while loading, then flat from the first ready frame, never in between',
  );
  settled(r, 'down');
});

// ---------------------------------------------------------------- 2. a third and fourth player at the toe
const HINGE_U = RING_GAP.hinge / 100,
  HINGE_Y = ringDeckY(RING_GAP.hinge) / 100,
  TOE_DECK_Y = ringDeckY(Math.round(TOE_U * 100)) / 100,
  GAP = RING_GAP.leaf / 100;
/** Head height over the deck of a standing player (Buddy's capsule top, generously). */
const BODY_H = 1.8;
/** Whether the leaf's plate (0.8 m thick, hinged at HINGE_U, 17 m to its toe) is inside a player standing on the toe's
 * deck at `u` (a body PLAYER_R either side along the line, feet on the deck, head BODY_H up): over the body's span the
 * plate's slab reaches below the head and above the feet. The plate at `hd` m from the hinge (horizontally) stands
 * `hd * tan(deg)` over the hinge, out to its toe at `GAP * cos(deg)`. */
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
const rad = (deg: number) => (deg * Math.PI) / 180;
/** The steps a remote's pose is behind on another page: its uplink and the viewer's downlink (the server relays
 * presence), half a send period on average, then INTERP_MS of interpolation. */
const behind = (from: number, to: number) => from + to + Math.round((SEND_MS / 2 + INTERP_MS) / STEP_MS);

for (const [order, braceLast] of [
  ['the brace last (a 78 degree swing)', true],
  ['the weight last (the last quarter)', false],
] as const)
  for (const startU of [259.4, TOE_U + 0.9])
    test(`a third player at u ${startU} under the toe and a fourth on the deck as the leaf lands, ${order}`, () => {
      const r = room();
      // Alice braces, bob hangs, carol stands under the toe and dave on the deck; 0 to 200 ms one way.
      const alice = r.join('alice', 6),
        bob = r.join('bob', 3),
        carol = r.join('carol', 12),
        dave = r.join('dave', 0);
      r.ready();
      if (!braceLast) {
        assert.equal(alice.adapter.braceLeaf(), true);
        settled(r, 'braced');
      }
      for (let k = 1; k <= 3; k++) hang(r, bob);
      assert.equal(bob.adapter.shoulderFooting(2), true);
      settled(r, 'ready to land');
      // Each player's body on their own page, shoved by their own page's leaf only (leaf-view.ts `shove`: me.body).
      const own = new Map<Page, number>([
        [carol, startU],
        [dave, TOE_U - TOE_MARGIN - 1.5],
      ]);
      const trace = new Map<Page, number[]>([...own.keys()].map((p) => [p, []]));
      const at = r.step();
      if (braceLast) {
        assert.equal(bob.adapter.setFooting(3), true);
        r.run(40);
        assert.equal(alice.adapter.braceLeaf(), true);
      } else assert.equal(bob.adapter.setFooting(3), true);
      const from = r.step() - at;
      const mark = new Map([...r.pages.values()].map((p) => [p, p.degs.length]));
      for (let k = 0; k < 400; k++) {
        r.run();
        for (const [p, u] of own) {
          const v = toeShove(u, 0, p.motion.deg, p.motion.falling);
          own.set(p, u - v * DT);
          trace.get(p)!.push(own.get(p)!);
        }
      }
      const s = settled(r, 'down');
      assert.deepEqual([s.cw, s.brace], [4, 0]);
      // On their own pages: never inside the plate, still on the deck (walked back at most the toe's width), not
      // moved up or sideways (the shove is along the line only), and the one on the deck never moved.
      for (const [p, us] of trace) {
        const degs = p.degs.slice(mark.get(p));
        const hit = us.findIndex((u, i) => plateHits(u, degs[i]!));
        assert.equal(hit, -1, `${p.pid} on their own page: inside the plate at frame ${hit}`);
        assert.ok(us.at(-1)! > TOE_U - TOE_MARGIN - 2, `${p.pid} still on bent 13's deck (u ${us.at(-1)!.toFixed(2)})`);
      }
      assert.ok(
        trace.get(dave)!.every((u) => u === TOE_U - TOE_MARGIN - 1.5),
        'the one on the deck is never moved',
      );
      // On each other page: carol drawn where her presence says, late by `behind`; never inside that page's plate.
      const late: string[] = [];
      for (const viewer of [alice, bob, dave]) {
        const lag = behind(12, viewer === alice ? 6 : viewer === bob ? 3 : 0);
        const us = trace.get(carol)!,
          degs = viewer.degs.slice(mark.get(viewer));
        let frames = 0;
        for (let i = 0; i < us.length; i++) if (plateHits(us[Math.max(0, i - lag)]!, degs[i]!)) frames++;
        if (frames) late.push(`${viewer.pid}: ${Math.round(frames * STEP_MS)} ms`);
      }
      assert.deepEqual(late, [], `carol's avatar drawn inside the plate on others' pages (${from} steps to the press)`);
    });
