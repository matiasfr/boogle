// Full accepted line-one preparation, then real host restart and session cuts around the unique beam (replication
// R1a: actions apply on arrival; orderly restarts save); and the pack and Q4, judged where their actor stands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_ROCKS, LINE1_GREAT_TREE } from '../../src/sim/railway-line-layout.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { Pile } from '../../src/sim/railway-components.ts';
import { railMaxDuration } from '../../src/sim/railway-queries-line1.ts';
import { line2Active, line2Rails, line2SeaOpen, railCounts } from '../../src/sim/railway-queries-line2.ts';
import { LINE2_FORGE, LINE2_PACK, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { CART_PHASE, cartCycleTicks } from '../../src/sim/railway-cart.ts';
import {
  buildSeedWorld,
  cart,
  chopTo,
  forge,
  invariant,
  job,
  qjob,
  rail,
  railClock,
  railwayAtQ4,
  railwayAtQ5,
  railwayAtTrains,
  trees,
  type Seed,
} from '../../test/helpers/rail.ts';
import type { TuneApi } from '../../src/world/rules/tune.ts';

type Obj = Record<string, unknown>;
for (const early of [true, false]) {
  test(`line host: summit pull ${early ? 'before' : 'after'} Q4 survives a restart; Q5 respects the active stretch`, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-q5-'));
    const store = createStore({ dataDir: dir, maxRooms: 2 });
    await store.init();
    let now = 1800000000000;
    const sent: Obj[] = [];
    const create = () => {
      const value = createRailwayWorldHost({
        roomId: railwayRoomId('line-host-q5'),
        store,
        tick: false,
        now: () => now,
        pidOf: () => 'a',
      });
      value.onSend((message) => sent.push(message));
      return value;
    };
    let host = create();
    const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
    const ticks = async (n: number) => {
      for (let i = 0; i < n; i++) {
        now += 100;
        host.step(0.1);
      }
      await host.sync.whenDurable();
    };
    try {
      await host.whenReady();
      const w = early ? railwayAtQ4() : railwayAtQ5('q4-done');
      while (host.sync.world.tick <= w.t) await ticks(1);
      world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
      host.rules.railway.touchAll();
      host.deliver({ t: 'r:open' }, 's1');
      await ticks(3);
      const getSession = () => {
        const session = sent.findLast((m) => m.t === 'r:session' && m.to === 's1');
        assert.ok(session);
        return session;
      };
      let session = getSession();
      let request = Number(session.next) - 1;
      const edit = async (e: Obj, at: [number, number, number]) => {
        now += 1000;
        host.deliver(
          { t: 'r:edit', e: { ...e, epoch: Number(session.epoch), request: ++request, at, ms: now - 1800000000000 } },
          's1',
        );
        await ticks(3);
        assert.equal(invariant(world()), null);
        return host.rules.railway.outcome('a', Number(session.epoch), request)!;
      };
      const q5 = LINE2_STATIONS[4]!;
      const frame: [number, number, number] = [q5.x, 2400, q5.z];
      const summit: [number, number, number] = [101180, 10240, -600];
      assert.equal((await edit({ op: 'rail.seaSwitch' }, [101180, 2400, -600])).status, 'rejected');
      assert.equal((await edit({ op: 'rail.seaSwitch' }, frame)).status, 'rejected');
      assert.equal(rail(world()).sea, false);
      // Rack logs give the actor something real to deposit on either side of the pull.
      const active = LINE2_STATIONS[early ? 3 : 4]!;
      const rack: [number, number, number] = [active.x, 2400, active.z];
      await ticks(3 * cartCycleTicks(early ? 3 : 4));
      assert.equal((await edit({ op: 'rail.depotTake' }, rack)).status, 'accepted');
      const deposit = { op: 'rail.deposit', station: 'Q5', n: 1, kind: 0 };
      assert.equal((await edit(deposit, frame)).status, early ? 'noop' : 'accepted');
      assert.equal(qjob(world(), 4).start, -1);
      if (!early) {
        await host.close({ save: true });
        host = create();
        await host.whenReady();
        assert.equal(rail(world()).sea, false);
        assert.equal(qjob(world(), 4).stock, 1, 'gated stock survives restart');
        host.deliver({ t: 'r:open' }, 's1');
        await ticks(3);
        session = getSession();
        request = Number(session.next) - 1;
      }
      assert.equal((await edit({ op: 'rail.seaSwitch' }, summit)).status, 'accepted');
      assert.equal((await edit({ op: 'rail.seaSwitch' }, summit)).status, 'noop');
      assert.equal(line2SeaOpen(world()), true);
      assert.equal((await edit(deposit, frame)).status, early ? 'noop' : 'accepted');
      if (early) {
        const carry = host.rules.railway.account('a')!.carry;
        assert.ok(carry > 0, 'a real log load was refused');
        assert.equal(
          (await edit({ op: 'rail.drop', n: carry, kind: 0, x: frame[0], y: frame[1], z: frame[2] }, frame)).status,
          'accepted',
        );
        assert.equal((await edit({ op: 'rail.depotRailTake' }, rack)).status, 'accepted');
        assert.ok(host.rules.railway.account('a')!.rails! > 0);
        assert.equal((await edit({ op: 'rail.deposit', station: 'Q5', n: 1, kind: 2 }, frame)).status, 'noop');
        const q5 = qjob(world(), 4);
        assert.deepEqual([q5.stock, q5.railStock, q5.start], [0, 0, -1]);
      }
      const rails = railCounts(world()).rails!;
      assert.equal(rails.total, rails.poured);
      await host.close({ save: true });
      host = create();
      await host.whenReady();
      assert.equal(rail(world()).sea, true);
      assert.equal(line2SeaOpen(world()), true);
      assert.equal(line2Active(world()), early ? 3 : 4, 'restart cannot advance the active stretch');
      const restored = railCounts(world()).rails!;
      assert.equal(restored.total, rails.total);
      assert.equal(restored.total, restored.poured);
      assert.equal(invariant(world()), null);
    } finally {
      await host.close({ save: false }).catch(() => {});
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
}
test('line host: the glider judged on the summit device, only after Q5; one shared take survives a restart', async () => {
  const { LINE2_GLIDE, LINE2_HOOK, LINE2_SEA } = await import('../../src/sim/railway-line2-layout.ts');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-glide-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () => {
    const value = createRailwayWorldHost({
      roomId: railwayRoomId('line-host-glide'),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => sid,
    });
    value.onSend((message) => sent.push(message));
    return value;
  };
  let host = create();
  const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const sessions = new Map<string, { epoch: number; request: number }>();
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(session);
    sessions.set(sid, { epoch: Number(session.epoch), request: Number(session.next) - 1 });
  };
  const edit = async (sid: string, e: Obj, at: [number, number, number]) => {
    const s = sessions.get(sid)!;
    now += 1000;
    host.deliver({ t: 'r:edit', e: { ...e, epoch: s.epoch, request: ++s.request, at, ms: now - 1800000000000 } }, sid);
    await ticks(3);
    assert.equal(invariant(world()), null);
    return host.rules.railway.outcome(sid, s.epoch, s.request)!;
  };
  const load = async (w: Seed) => {
    while (host.sync.world.tick <= w.t) await ticks(1);
    world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
    host.rules.railway.touchAll();
  };
  const device: [number, number, number] = [LINE2_GLIDE.x, LINE2_GLIDE.y, LINE2_GLIDE.z];
  const glide = { op: 'rail.glide' };
  try {
    await host.whenReady();
    // Before Q5 is laid the device is sealed: refused by the rule even at the device.
    await load(railwayAtQ5('q5-finishing'));
    await open('a');
    assert.equal((await edit('a', glide, device)).status, 'noop');
    assert.equal(rail(world()).glide, false);
    await host.close({ save: false });
    host = create();
    await host.whenReady();
    await load(railwayAtQ5('q5-done'));
    for (const sid of ['a', 'b']) await open(sid);
    // Heard only on the summit device: not below it at the foot (y 20 m), not at the sea switch 4.5 m off, not at the
    // hook device.
    assert.equal((await edit('a', glide, [LINE2_GLIDE.x, 2000, LINE2_GLIDE.z])).status, 'rejected');
    assert.equal((await edit('a', glide, [LINE2_SEA.x, LINE2_SEA.y, LINE2_SEA.z])).status, 'rejected');
    assert.equal((await edit('a', glide, [LINE2_HOOK.x, LINE2_HOOK.y, LINE2_HOOK.z])).status, 'rejected');
    // Reach is 3.2 m across the deck and from 2.2 m below to 3 m above the device's foot.
    assert.equal((await edit('a', glide, [LINE2_GLIDE.x + 330, LINE2_GLIDE.y, LINE2_GLIDE.z])).status, 'rejected');
    assert.equal((await edit('a', glide, [LINE2_GLIDE.x, LINE2_GLIDE.y + 320, LINE2_GLIDE.z])).status, 'rejected');
    assert.equal(rail(world()).glide, false);
    assert.equal((await edit('a', glide, [LINE2_GLIDE.x + 300, LINE2_GLIDE.y, LINE2_GLIDE.z])).status, 'accepted');
    assert.equal((await edit('b', glide, device)).status, 'noop', 'one shared take');
    assert.equal(rail(world()).glide, true);
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(rail(world()).glide, true, 'the glider survives an orderly restart');
    assert.equal(invariant(world()), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('line host: the hook judged at p2 moved out for the second track, not its old spot; a taken hook survives a restart', async () => {
  // generic-lines step 2 moved pillar p2 (and its device) 11 m left of line 2 at s 89.5. No saved field holds the
  // device's position (Rail.hook is a flag), so a save with the hook taken loads as it was: no WORLD_NS bump.
  const { LINE2_HOOK } = await import('../../src/sim/railway-line2-layout.ts');
  const OLD = { x: 99954, z: 2086, y: 2350 };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-hook-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () => {
    const value = createRailwayWorldHost({
      roomId: railwayRoomId('line-host-hook'),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => sid,
    });
    value.onSend((message) => sent.push(message));
    return value;
  };
  let host = create();
  const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const sessions = new Map<string, { epoch: number; request: number }>();
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(session);
    sessions.set(sid, { epoch: Number(session.epoch), request: Number(session.next) - 1 });
  };
  const edit = async (sid: string, e: Obj, at: [number, number, number]) => {
    const s = sessions.get(sid)!;
    now += 1000;
    host.deliver({ t: 'r:edit', e: { ...e, epoch: s.epoch, request: ++s.request, at, ms: now - 1800000000000 } }, sid);
    await ticks(3);
    assert.equal(invariant(world()), null);
    return host.rules.railway.outcome(sid, s.epoch, s.request)!;
  };
  const hook = { op: 'rail.hook' };
  try {
    await host.whenReady();
    // Q3 laid, the hook not yet taken.
    const w = buildSeedWorld('q3-done');
    while (host.sync.world.tick <= w.t) await ticks(1);
    world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
    host.rules.railway.touchAll();
    for (const sid of ['a', 'b']) await open(sid);
    assert.equal(rail(world()).hook, false);
    // The old device spot is 5 m off the new one: refused there, and past the 3.2 m reach of the new spot.
    assert.equal((await edit('a', hook, [OLD.x, OLD.y, OLD.z])).status, 'rejected');
    assert.equal((await edit('a', hook, [LINE2_HOOK.x + 330, LINE2_HOOK.y, LINE2_HOOK.z])).status, 'rejected');
    assert.equal(rail(world()).hook, false);
    assert.equal((await edit('a', hook, [LINE2_HOOK.x + 300, LINE2_HOOK.y, LINE2_HOOK.z])).status, 'accepted');
    assert.equal((await edit('b', hook, [LINE2_HOOK.x, LINE2_HOOK.y, LINE2_HOOK.z])).status, 'noop', 'one shared take');
    assert.equal(rail(world()).hook, true);
    const saved = JSON.stringify(host.rules.railway.world().snapshot());
    for (const cm of [OLD.x, OLD.z, LINE2_HOOK.x, LINE2_HOOK.z])
      assert.ok(!saved.includes(String(cm)), `no saved field holds the hook's position (${cm})`);
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(rail(world()).hook, true, 'a save with the hook taken loads as it was');
    assert.equal(invariant(world()), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('line host keeps a departed carrier the beam through its grace, then grounds it; a restart keeps it too', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const roomId = railwayRoomId('line-host');
  let now = 1800000000000;
  const poses = new Map<string, RailwayPosition>();
  let people: (RailwayPosition | null)[] = [];
  const sent: Obj[] = [];
  const sessions = new Map<string, { epoch: number; request: number }>();
  const pidOf = (sid: string) => (sid.startsWith('a') ? 'alice' : 'bob');
  const create = () => {
    const value = createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      now: () => now,
      pidOf,
      positions: () => people,
    });
    value.onSend((message) => sent.push(message));
    return value;
  };
  let host = create();
  const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const pose = (sid: string, x: number, z: number) => poses.set(sid, { x: x / 100, z: z / 100, at: now });
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const response = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(response);
    sessions.set(sid, { epoch: Number(response.epoch), request: 0 });
  };
  const submit = (sid: string, e: Obj) => {
    const session = sessions.get(sid)!;
    const request = ++session.request;
    // A client action carries where its actor stands (cm) and its action clock (ms).
    const p = poses.get(sid);
    const actor = p
      ? {
          at: [Math.round(p.x * 100) || 0, Math.round((p.y ?? 0) * 100) || 0, Math.round(p.z * 100) || 0],
          ms: now - 1800000000000,
        }
      : {};
    host.deliver({ t: 'r:edit', e: { ...e, epoch: session.epoch, request, ...actor } }, sid);
    return request;
  };
  const edit = async (sid: string, e: Obj) => {
    const request = submit(sid, e);
    await ticks(3);
    const response = host.rules.railway.outcome(pidOf(sid), sessions.get(sid)!.epoch, request);
    assert.equal(response?.status, 'accepted', JSON.stringify({ e, response }));
    assert.equal(invariant(world()), null);
  };
  const logs = async (index: number, n: number) => {
    const station = LINE1_STATIONS[index]!;
    for (let remaining = n; remaining > 0;) {
      const wanted = Math.min(8, remaining);
      while (host.rules.railway.account('alice')!.carry < wanted) {
        const k = trees(world()).findIndex((t) => t.left > 0);
        const source = RAILWAY_SOURCES[k]!;
        pose('a', source[1], source[2]);
        await edit('a', { op: 'rail.chop', id: source[0], yaw: 0, collapsed: false });
      }
      pose('a', station.x, station.z);
      await edit('a', { op: 'rail.deposit', station: station.id, kind: 0, n: wanted });
      remaining -= wanted;
    }
  };
  try {
    await host.whenReady();
    await open('a');
    pose('a', RAILWAY_T1.x, RAILWAY_T1.z);
    await edit('a', { op: 'rail.wake' });
    await ticks(RAILWAY_T1.wakeTicks);
    await logs(0, 24);
    await ticks(railMaxDuration(world()) + 3);
    await logs(1, 32);
    for (let i = 0; i < 4; i++) {
      pose('a', LINE1_ROCKS[0].x, LINE1_ROCKS[0].z);
      await edit('a', { op: 'rail.mine', id: 0 });
      if (i === 0) {
        const rock = LINE1_ROCKS[0];
        await edit('a', { op: 'rail.drop', kind: 1, n: 2, x: rock.x, y: 100, z: rock.z });
        const pileIds = (kind?: number) => {
          const ids: number[] = [];
          world().each([Pile], (id, p) => {
            if (kind === undefined || p.kind === kind) ids.push(id);
          });
          return ids;
        };
        const [pile] = pileIds(1);
        assert.ok(pile !== undefined, 'the dropped stone lies as a pile');
        assert.equal(host.rules.railway.account('alice')!.stone, 0);
        await edit('a', { op: 'rail.take', kind: 1, id: pile });
        assert.equal(host.rules.railway.account('alice')!.stone, 2);
        assert.ok(!pileIds().includes(pile));
      }
    }
    pose('a', LINE1_STATIONS[1]!.x, LINE1_STATIONS[1]!.z);
    await edit('a', { op: 'rail.deposit', station: 'T2', kind: 1, n: 8 });
    await host.close({ save: true });
    now += 3600000;
    host = create();
    await host.whenReady();
    assert.equal(job(world(), 1).completion, 1, 'absence completes funded T2');
    assert.equal(job(world(), 2).start, -1, 'absence cannot fund T3');
    const marker = railClock(world()).resumeMarker;
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(railClock(world()).resumeMarker, marker, 'restart consumes no interval twice');
    assert.equal(job(world(), 2).start, -1);
    await ticks(4);
    await open('a');
    await logs(2, 40);
    pose('a', LINE1_STATIONS[2]!.x, LINE1_STATIONS[2]!.z);
    for (let i = 0; i < 12; i++) {
      pose('a', LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z);
      await edit('a', { op: 'rail.beamChop' });
    }
    const beam = () => host.rules.railway.beam(); // a copy of the beam row, read again after each change
    assert.equal(beam().state, 'available');
    pose('a', beam().x, beam().z);
    await edit('a', { op: 'rail.beamTake', revision: beam().revision });
    await edit('a', {
      op: 'rail.beamDrop',
      revision: beam().revision,
      x: LINE1_GREAT_TREE.x + 100,
      y: 3000,
      z: LINE1_GREAT_TREE.z,
    });
    assert.equal(beam().state, 'ground');
    const groundRevision = beam().revision;
    people = [{ x: beam().x / 100, z: beam().z / 100, at: now }];
    now += 22 * 60000;
    people[0]!.at = now;
    await ticks(5);
    assert.equal(beam().age, 21);
    assert.equal(beam().state, 'ground', 'nearby visitor prevents slow ground-beam recovery');
    people = [];
    await ticks(5);
    assert.equal(beam().state, 'available', 'eligible unobserved ground beam returns through accepted maintenance');
    assert.equal(beam().revision, groundRevision + 1);
    assert.equal(beam().x, LINE1_GREAT_TREE.x);
    pose('a', beam().x, beam().z);
    submit('a', { op: 'rail.beamTake', revision: beam().revision });
    await host.sync.whenDurable();
    host.depart('a'); // The claim applied on arrival; the carrier is away, and keeps it through the grace.
    await ticks(9);
    assert.equal(beam().state, 'held', 'an absent carrier keeps the beam');
    now += host.rules.tune.get('railBeamGraceS') * 1000;
    await ticks(3);
    assert.equal(beam().state, 'ground', 'past the grace it goes down where they stood, not back to the tree');
    assert.equal(beam().holder, '');
    assert.deepEqual([beam().x, beam().z], [LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z], 'they stood where they took it');
    const departedRevision = beam().revision;
    await open('a2');
    pose('a2', beam().x, beam().z);
    await edit('a2', { op: 'rail.beamTake', revision: beam().revision });
    assert.equal(beam().state, 'held');
    assert.equal(host.rules.railway.beamRelease('alice', 1, departedRevision), 0);
    await ticks(4);
    assert.equal(beam().state, 'held', 'old departure cannot release the new epoch');
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(beam().state, 'held', 'a restart keeps the carried beam for its carrier');
    assert.equal(beam().holder, 'alice');
    await open('a3');
    assert.equal(beam().epoch, sessions.get('a3')!.epoch, 'the returning carrier still carries it');
    pose('a3', LINE1_STATIONS[2]!.x, LINE1_STATIONS[2]!.z);
    submit('a3', { op: 'rail.beamDeposit', station: 'T3', revision: beam().revision });
    await host.sync.whenDurable();
    host.depart('a3');
    await ticks(8);
    assert.equal(beam().state, 'allocated', 'accepted delivery defeats later departure');
    await ticks(railMaxDuration(world()) + 3);
    assert.equal(beam().state, 'used');
    assert.equal(job(world(), 2).completion, 1);
    assert.equal(invariant(world()), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('line host: the pack and Q4 judged where their actor stands; gate, shelf and pack survive a restart', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-q4-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const roomId = railwayRoomId('line-host-q4');
  let now = 1800000000000;
  const sent: Obj[] = [];
  const sessions = new Map<string, { epoch: number; request: number }>();
  const create = () => {
    const value = createRailwayWorldHost({ roomId, store, tick: false, now: () => now, pidOf: () => 'a' });
    value.onSend((message) => sent.push(message));
    return value;
  };
  let host = create();
  const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const response = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(response);
    sessions.set(sid, { epoch: Number(response.epoch), request: 0 });
  };
  /** An action from where its actor stands (cm); resolves to the recorded outcome. */
  const edit = async (sid: string, e: Obj, at: [number, number, number]) => {
    const session = sessions.get(sid)!;
    const request = ++session.request;
    now += 1000; // past every cadence
    host.deliver({ t: 'r:edit', e: { ...e, epoch: session.epoch, request, at, ms: now - 1800000000000 } }, sid);
    await ticks(3);
    assert.equal(invariant(world()), null);
    return host.rules.railway.outcome('a', session.epoch, request)!;
  };
  try {
    await host.whenReady();
    const w = railwayAtQ4();
    while (host.sync.world.tick < w.t) await ticks(1);
    world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
    host.rules.railway.touchAll();
    await open('s1');
    const q4 = LINE2_STATIONS[3]!;
    // The pack chest: refused from the Q4 frame, opened beside the forge.
    assert.equal((await edit('s1', { op: 'rail.pack' }, [q4.x, 0, q4.z])).status, 'rejected');
    assert.equal(rail(world()).pack, false);
    assert.equal((await edit('s1', { op: 'rail.pack' }, [LINE2_PACK.x, 0, LINE2_PACK.z])).status, 'accepted');
    assert.equal(rail(world()).pack, true);
    // "Call cart to forge" is gone (v25): its op is refused even where its handle stood.
    const handle = [91520, 0, 1480] as [number, number, number];
    assert.equal((await edit('s1', { op: 'rail.cartCall' }, handle)).status, 'rejected');
    // The cart's first trip to the Q4 rack; the shelf is taken from beside the frame, not from the forge.
    let waited = 0;
    // (A load under way from Q2, which the helper filled by hand, lands first; the trip after brings the rails.)
    while (!(cart(world()).phase === CART_PHASE.DROP && rail(world()).depotRails > 0) && waited < 3 * cartCycleTicks(3))
      waited += (await ticks(10), 10);
    assert.equal(cart(world()).phase, CART_PHASE.DROP, 'the cart reached the rack');
    assert.equal(rail(world()).depotRails, LINE2_STATIONS[3]!.bill[1]);
    const far = await edit('s1', { op: 'rail.depotRailTake' }, [LINE2_FORGE.x, 0, LINE2_FORGE.z]);
    assert.equal(far.status, 'rejected');
    const take = await edit('s1', { op: 'rail.depotRailTake' }, [q4.x, 0, q4.z]);
    assert.equal(take.accepted, LINE2_STATIONS[3]!.bill[1], 'a back of 16 takes them all');
    // The quarry gate is up: deliveries stock the frame without starting it.
    const shut = await edit('s1', { op: 'rail.deposit', station: 'Q4', n: 8, kind: 2 }, [q4.x, 0, q4.z]);
    assert.equal(shut.status, 'accepted');
    assert.equal(qjob(world(), 3).railStock, 8);
    assert.equal(qjob(world(), 3).start, -1);
    const rails = railCounts(world()).rails!;
    assert.equal(rails.total, rails.poured);
    // A restart keeps the pack, the shelf and the rails on the back.
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(rail(world()).pack, true);
    assert.equal(host.rules.railway.account('a')!.rails, LINE2_STATIONS[3]!.bill[1] - 8);
    assert.equal(qjob(world(), 3).railStock, 8);
    assert.equal(rail(world()).lever, false);
    assert.equal(railCounts(world()).rails!.total, rails.total);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('line host: the boiler and trains; a call judged on the halt; trains survive a restart', async () => {
  const { LINE2_BOILER, LINE2_OLD_TRAIN } = await import('../../src/sim/railway-line2-layout.ts');
  const { LINE_HALTS, trainAlong } = await import('../../src/sim/railway-train.ts');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-trains-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  let people: (RailwayPosition | null)[] = [];
  const create = () => {
    const h = createRailwayWorldHost({
      roomId: railwayRoomId('line-trains'),
      store,
      tick: false,
      now: () => now,
      pidOf: () => 'a',
      positions: () => people,
    });
    h.onSend((m) => sent.push(m));
    return h;
  };
  let host = create(),
    epoch = 0,
    request = 0;
  const world = () => host.rules.railway.world(); // read again each time: a restart replaces it
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const open = async () => {
    host.deliver({ t: 'r:open' }, 's');
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === 's')!;
    epoch = Number(session.epoch);
    request = Number(session.next) - 1;
  };
  const action = async (e: Obj, at: [number, number, number]) => {
    now += 1000;
    host.deliver({ t: 'r:edit', e: { ...e, epoch, request: ++request, at, ms: now - 1800000000000 } }, 's');
    await host.sync.whenDurable();
    return host.rules.railway.outcome('a', epoch, request)!;
  };
  const apron: [number, number, number] = [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z];
  const camp: [number, number, number] = [LINE2_OLD_TRAIN.x, 3030, LINE2_OLD_TRAIN.z];
  const boiler = () => host.rules.railway.boiler();
  try {
    await host.whenReady();
    const w = railwayAtTrains('boiler');
    chopTo(w, 'a', 4);
    while (host.sync.world.tick <= w.t) await ticks(1);
    world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
    host.rules.railway.touchAll();
    await open();
    // Station 6 takes nothing by hand before the fit (docs/plans/boiler-first-choice.md, step 3): a real load at its
    // frame is refused and stays on the back.
    const q6: [number, number, number] = [LINE2_STATIONS[5]!.x, 2400, LINE2_STATIONS[5]!.z];
    const carry = host.rules.railway.account('a')!.carry;
    assert.ok(carry >= 4);
    assert.equal((await action({ op: 'rail.deposit', station: 'Q6', n: carry, kind: 0 }, q6)).status, 'noop');
    assert.equal(qjob(world(), 5).stock, 0);
    assert.equal(host.rules.railway.account('a')!.carry, carry);
    const drop = { op: 'rail.drop', n: carry, kind: 0, x: q6[0], y: q6[1], z: q6[2] };
    assert.equal((await action(drop, q6)).status, 'accepted');
    assert.equal((await action({ op: 'rail.boilerTake', revision: boiler().revision }, camp)).status, 'rejected');
    // The server follows the hauled boiler from presence (body centre, metres) and a leaver past the grace has it put
    // down where they last stood (docs/plans/boiler-first-choice.md, step 5): on the apron, inside the haul area.
    const grace = host.rules.tune.get('railBeamGraceS') * 1000;
    const stand = (x: number, z: number) =>
      (people = [{ pid: 'a', x: x / 100, y: (apron[1] + 45) / 100, z: z / 100, at: now }]);
    assert.equal((await action({ op: 'rail.boilerTake', revision: boiler().revision }, apron)).status, 'accepted');
    stand(apron[0] + 200, apron[2]);
    await ticks(2);
    assert.deepEqual([boiler().x, boiler().y, boiler().z], [apron[0] + 200, apron[1], apron[2]]);
    people = [];
    host.depart('s');
    await ticks(2);
    assert.equal(boiler().state, 'held');
    now += grace;
    await ticks(2);
    assert.equal(boiler().state, 'ground');
    assert.equal(boiler().holder, '');
    assert.deepEqual([boiler().x, boiler().y, boiler().z], [apron[0] + 200, apron[1], apron[2]]);
    // A holder back within the grace still holds it.
    await open();
    assert.equal((await action({ op: 'rail.boilerTake', revision: boiler().revision }, apron)).status, 'accepted');
    host.depart('s');
    now += grace / 2;
    await ticks(2);
    await open();
    now += grace;
    await ticks(2);
    assert.equal(boiler().state, 'held');
    // Stood outside the haul area (off Home's apron), a leaver's boiler goes back to the pedestal.
    stand(120000, -20000);
    await ticks(12);
    assert.equal(boiler().x, 120000);
    // A few millimetres south of z = 0 rounds to -0, which the ECS int schema refuses: the host keeps it +0, and the
    // room still saves while the boiler is held there (the beam's carrier goes through the same rounding).
    people = [{ pid: 'a', x: 1200, y: (apron[1] + 45) / 100, z: -0.003, at: now }];
    await ticks(12);
    assert.ok(Object.is(boiler().z, 0));
    assert.doesNotThrow(() => host.rules.railway.world().snapshot());
    people = [];
    host.depart('s');
    now += grace;
    await ticks(2);
    assert.equal(boiler().state, 'pedestal');
    await open();
    assert.equal((await action({ op: 'rail.boilerTake', revision: boiler().revision }, apron)).status, 'accepted');
    assert.equal((await action({ op: 'rail.boilerFit', revision: boiler().revision }, apron)).status, 'rejected');
    // Unreachable ground cargo is protected by nearby players, then recovered by the same pulse on restart.
    assert.equal(
      (
        await action(
          { op: 'rail.boilerDrop', revision: boiler().revision, x: apron[0], y: apron[1], z: apron[2] },
          apron,
        )
      ).status,
      'accepted',
    );
    people = [{ pid: 'a', x: apron[0] / 100, z: apron[2] / 100, at: now + 22 * 60000 }];
    now += 22 * 60000;
    await ticks(2);
    assert.equal(boiler().state, 'ground');
    assert.equal(boiler().age, 21);
    people = [];
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    await ticks(2);
    assert.equal(boiler().state, 'pedestal');
    await open();
    assert.equal((await action({ op: 'rail.boilerTake', revision: boiler().revision }, apron)).status, 'accepted');
    assert.equal((await action({ op: 'rail.boilerFit', revision: boiler().revision }, camp)).status, 'accepted');
    // A stop request: from the halt's lever (on its platform) or aboard the line's train (works-late-game step 1).
    const h = LINE_HALTS[4];
    const call = (id: number, dir: number, at: [number, number, number]) => action({ op: 'rail.call', id, dir }, at);
    assert.equal((await call(4, -1, [h.x + h.reach + 2000, h.y, h.z])).status, 'rejected');
    assert.equal((await call(4, -1, [h.x, h.y + 3000, h.z])).status, 'rejected');
    assert.equal((await call(4, 0, [h.x, h.y, h.z])).status, 'rejected', 'a way is needed');
    assert.equal((await call(4, -1, [h.x, h.y, h.z])).status, 'accepted');
    assert.equal((await call(4, -1, [h.x, h.y, h.z])).status, 'noop', 'already asked');
    // Far Head is line 2's end until Q6 opens the pier: its up platform's lever is refused (no train stands there).
    const { RAIL_HALTS } = await import('../../src/sim/railway-lines.ts');
    const up = RAIL_HALTS[4]!.platforms[0];
    assert.equal((await call(4, 1, [up.x, up.y, up.z])).status, 'noop', "Far Head's up lever, before the pier");
    // The two platforms stand about 10 m apart, inside each lever's reach: from the down platform's far edge only.
    const off = Math.hypot(h.x - up.x, h.z - up.z),
      edge: [number, number, number] = [
        Math.round(h.x + ((h.x - up.x) * 400) / off),
        h.y,
        Math.round(h.z + ((h.z - up.z) * 400) / off),
      ];
    assert.equal((await call(4, 1, edge)).status, 'rejected', 'the up way from the down platform');
    // Aboard: the ask names the rider's train (slot 1, line 2's first, standing at the village).
    const { railLinePoint } = await import('../../src/sim/railway-line-path.ts');
    const p = railLinePoint(1, trainAlong(host.rules.railway.train(1)!, 1, host.sync.world.tick));
    const on: [number, number, number] = [Math.round(p.x), 2200, Math.round(p.z)];
    const ride = (train: unknown) => action({ op: 'rail.call', id: 3, dir: 1, train }, on);
    for (const bad of ['1', 1.5, -1, 3, null])
      assert.equal((await ride(bad)).status, 'rejected', `malformed train ${JSON.stringify(bad)}`);
    assert.equal((await ride(2)).status, 'rejected', 'from the wrong train: aboard 1, naming 2 (at Far Head)');
    assert.equal((await ride(0)).status, 'rejected', "line 1's train for a line 2 halt");
    assert.equal((await call(3, 1, on)).status, 'rejected', 'aboard without naming the train');
    assert.equal((await ride(1)).status, 'accepted', 'aboard');
    assert.equal(host.rules.railway.train(1)!.req > 0, true, "the rider's own train holds it");
    for (let t = 0; host.rules.railway.train(1)!.phase !== 1 && t < 200; t++) await ticks(1);
    assert.equal(host.rules.railway.train(1)!.phase, 1);
    const tick = host.sync.world.tick,
      rows = [0, 1, 2].map((k) => host.rules.railway.train(k)!);
    const pose = rows.map((r, k) => trainAlong(r, k ? 1 : 0, tick));
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(host.sync.world.tick, tick);
    assert.deepEqual(
      [0, 1, 2].map((k) => host.rules.railway.train(k)),
      rows,
    );
    assert.deepEqual(
      rows.map((_r, k) => trainAlong(host.rules.railway.train(k)!, k ? 1 : 0, host.sync.world.tick)),
      pose,
    );
    assert.equal(line2Rails(world()), forge(world()).poured);
    assert.equal(invariant(world()), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("line host: a proto room's controller can tune all eight of the glider's numbers", async (t) => {
  const { supplyFixture } = await import('./fixtures/railway-supply-fixture.ts');
  const { CATALOG } = await import('../../src/tunables/catalog.ts');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-line-host-glide-tune-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const f = await supplyFixture(dir, railwayRoomId('proto-glide-tune'), false);
  const tune = () => {
    assert.ok('tune' in f.host.rules);
    return f.host.rules.tune as TuneApi;
  };
  const keys = CATALOG.filter((c) => c.owner === 'src/entities/railway/glide-step.ts');
  assert.equal(keys.length, 8, "the glider's eight tunables");
  let request = 0;
  try {
    for (const spec of keys) {
      const key = spec.sharedKey!;
      const before = tune().get(key);
      const v = before + 1 <= spec.max ? before + 1 : before - 1;
      f.host.deliver(
        {
          t: 'w:edit',
          e: {
            op: 'tune.commit',
            i: 0,
            j: 0,
            key,
            v,
            expectedRevision: tune().tune.revision,
            requestId: `glide-tune-${++request}`,
          },
        },
        'supplysession',
      );
      await f.ticks(4);
      assert.equal(tune().get(key), v, `${key} accepted from the controller`);
    }
  } finally {
    await f.host.close({ save: false });
  }
});
