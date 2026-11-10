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
import { railMaxDuration } from '../../src/sim/railway-line.ts';
import { railwayCheck, railwayInvariant } from '../../src/sim/railway-world.ts';
import { railCounts } from '../../src/sim/railway.ts';
import { LINE2_FORGE, LINE2_PACK, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { line2Active, line2SeaOpen } from '../../src/sim/railway-line2.ts';
import { CART_CALL, CART_PHASE, cartCycleTicks } from '../../src/sim/railway-cart.ts';
import { worldOf } from '../../test/railway-live.ts';
import { railwayAtQ4, railwayAtQ5 } from '../../test/helpers/railway-q2.ts';
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
      host.rules.railway.world().load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
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
        assert.equal(railwayInvariant(host.rules.railway.railway), null);
        return host.rules.railway.outcome('a', Number(session.epoch), request)!;
      };
      const q5 = LINE2_STATIONS[4]!;
      const frame: [number, number, number] = [q5.x, 2400, q5.z];
      const summit: [number, number, number] = [101180, 10240, -600];
      assert.equal((await edit({ op: 'rail.seaSwitch' }, [101180, 2400, -600])).status, 'rejected');
      assert.equal((await edit({ op: 'rail.seaSwitch' }, frame)).status, 'rejected');
      assert.equal(host.rules.railway.railway.line2!.sea, false);
      // Rack logs give the actor something real to deposit on either side of the pull.
      const active = LINE2_STATIONS[early ? 3 : 4]!;
      const rack: [number, number, number] = [active.x, 2400, active.z];
      await ticks(3 * cartCycleTicks(early ? 3 : 4));
      assert.equal((await edit({ op: 'rail.depotTake' }, rack)).status, 'accepted');
      const deposit = { op: 'rail.deposit', station: 'Q5', n: 1, kind: 0 };
      assert.equal((await edit(deposit, frame)).status, early ? 'noop' : 'accepted');
      assert.equal(host.rules.railway.railway.line2!.jobs[4]!.start, -1);
      if (!early) {
        await host.close({ save: true });
        host = create();
        await host.whenReady();
        assert.equal(host.rules.railway.railway.line2!.sea, false);
        assert.equal(host.rules.railway.railway.line2!.jobs[4]!.stock, 1, 'gated stock survives restart');
        host.deliver({ t: 'r:open' }, 's1');
        await ticks(3);
        session = getSession();
        request = Number(session.next) - 1;
      }
      assert.equal((await edit({ op: 'rail.seaSwitch' }, summit)).status, 'accepted');
      assert.equal((await edit({ op: 'rail.seaSwitch' }, summit)).status, 'noop');
      assert.equal(line2SeaOpen(host.rules.railway.railway), true);
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
        const q5 = host.rules.railway.railway.line2!.jobs[4]!;
        assert.deepEqual([q5.stock, q5.railStock, q5.start], [0, 0, -1]);
      }
      const rails = railCounts(host.rules.railway.railway).rails!;
      assert.equal(rails.total, rails.poured);
      await host.close({ save: true });
      host = create();
      await host.whenReady();
      assert.equal(host.rules.railway.railway.line2!.sea, true);
      assert.equal(line2SeaOpen(host.rules.railway.railway), true);
      assert.equal(line2Active(host.rules.railway.railway), early ? 3 : 4, 'restart cannot advance the active stretch');
      const restored = railCounts(host.rules.railway.railway).rails!;
      assert.equal(restored.total, rails.total);
      assert.equal(restored.total, restored.poured);
      assert.equal(railwayInvariant(host.rules.railway.railway), null);
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
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
    return host.rules.railway.outcome(sid, s.epoch, s.request)!;
  };
  const load = async (w: { s: Parameters<typeof worldOf>[0]; t: number }) => {
    while (host.sync.world.tick <= w.t) await ticks(1);
    host.rules.railway.world().load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
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
    assert.equal(host.rules.railway.railway.line2!.glide, false);
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
    assert.equal(host.rules.railway.railway.line2!.glide, false);
    assert.equal((await edit('a', glide, [LINE2_GLIDE.x + 300, LINE2_GLIDE.y, LINE2_GLIDE.z])).status, 'accepted');
    assert.equal((await edit('b', glide, device)).status, 'noop', 'one shared take');
    assert.equal(host.rules.railway.railway.line2!.glide, true);
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(host.rules.railway.railway.line2!.glide, true, 'the glider survives an orderly restart');
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
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
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
  };
  const logs = async (index: number, n: number) => {
    const station = LINE1_STATIONS[index]!;
    for (let remaining = n; remaining > 0;) {
      const wanted = Math.min(8, remaining);
      while (host.rules.railway.account('alice')!.carry < wanted) {
        const k = host.rules.railway.railway.sources.findIndex((count) => count > 0);
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
    await ticks(railMaxDuration(host.rules.railway.railway) + 3);
    await logs(1, 32);
    for (let i = 0; i < 4; i++) {
      pose('a', LINE1_ROCKS[0].x, LINE1_ROCKS[0].z);
      await edit('a', { op: 'rail.mine', id: 0 });
      if (i === 0) {
        const rock = LINE1_ROCKS[0];
        await edit('a', { op: 'rail.drop', kind: 1, n: 2, x: rock.x, y: 100, z: rock.z });
        const pile = host.rules.railway.railway.piles.find((p) => p.kind === 1)!;
        assert.equal(host.rules.railway.account('alice')!.stone, 0);
        await edit('a', { op: 'rail.take', kind: 1, id: pile.id });
        assert.equal(host.rules.railway.account('alice')!.stone, 2);
        assert.ok(!host.rules.railway.railway.piles.some((p) => p.id === pile.id));
      }
    }
    pose('a', LINE1_STATIONS[1]!.x, LINE1_STATIONS[1]!.z);
    await edit('a', { op: 'rail.deposit', station: 'T2', kind: 1, n: 8 });
    await host.close({ save: true });
    now += 3600000;
    host = create();
    await host.whenReady();
    assert.equal(host.rules.railway.railway.line!.jobs[0].completion, 1, 'absence completes funded T2');
    assert.equal(host.rules.railway.railway.line!.jobs[1].start, -1, 'absence cannot fund T3');
    const marker = host.rules.railway.railway.resumeMarker;
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(host.rules.railway.railway.resumeMarker, marker, 'restart consumes no interval twice');
    assert.equal(host.rules.railway.railway.line!.jobs[1].start, -1);
    await ticks(4);
    await open('a');
    await logs(2, 40);
    pose('a', LINE1_STATIONS[2]!.x, LINE1_STATIONS[2]!.z);
    for (let i = 0; i < 12; i++) {
      pose('a', LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z);
      await edit('a', { op: 'rail.beamChop' });
    }
    const beam = () => host.rules.railway.beam(); // the read model is rebuilt after each change
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
    await ticks(railMaxDuration(host.rules.railway.railway) + 3);
    assert.equal(beam().state, 'used');
    assert.equal(host.rules.railway.railway.line!.jobs[1].completion, 1);
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
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
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
    return host.rules.railway.outcome('a', session.epoch, request)!;
  };
  const line2 = () => host.rules.railway.railway.line2!;
  try {
    await host.whenReady();
    const w = railwayAtQ4();
    while (host.sync.world.tick < w.t) await ticks(1);
    host.rules.railway.world().load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
    host.rules.railway.touchAll();
    await open('s1');
    const q4 = LINE2_STATIONS[3]!;
    // The pack chest: refused from the Q4 frame, opened beside the forge.
    assert.equal((await edit('s1', { op: 'rail.pack' }, [q4.x, 0, q4.z])).status, 'rejected');
    assert.equal(line2().pack, false);
    assert.equal((await edit('s1', { op: 'rail.pack' }, [LINE2_PACK.x, 0, LINE2_PACK.z])).status, 'accepted');
    assert.equal(line2().pack, true);
    // "Call cart to forge" is heard only at the handle by the turntable; a second call while one stands is a noop.
    assert.equal((await edit('s1', { op: 'rail.cartCall' }, [q4.x, 0, q4.z])).status, 'rejected');
    const call = [CART_CALL.x, 0, CART_CALL.z] as [number, number, number];
    assert.equal((await edit('s1', { op: 'rail.cartCall' }, call)).status, 'accepted');
    assert.equal((await edit('s1', { op: 'rail.cartCall' }, call)).status, 'noop');
    assert.equal(line2().cart.recall, true);
    // The cart's first trip to the Q4 rack; the shelf is taken from beside the frame, not from the forge.
    let waited = 0;
    // (A load under way from Q2, which the helper filled by hand, lands first; the trip after brings the rails.)
    while (!(line2().cart.phase === CART_PHASE.DROP && line2().depotRails > 0) && waited < 3 * cartCycleTicks(3))
      waited += (await ticks(10), 10);
    assert.equal(line2().cart.phase, CART_PHASE.DROP, 'the cart reached the rack');
    assert.equal(line2().cart.recall, false, 'the call was served at the forge on the way');
    assert.equal(line2().depotRails, LINE2_STATIONS[3]!.bill[1]);
    const far = await edit('s1', { op: 'rail.depotRailTake' }, [LINE2_FORGE.x, 0, LINE2_FORGE.z]);
    assert.equal(far.status, 'rejected');
    const take = await edit('s1', { op: 'rail.depotRailTake' }, [q4.x, 0, q4.z]);
    assert.equal(take.accepted, LINE2_STATIONS[3]!.bill[1], 'a back of 16 takes them all');
    // The quarry gate is up: deliveries stock the frame without starting it.
    const shut = await edit('s1', { op: 'rail.deposit', station: 'Q4', n: 8, kind: 2 }, [q4.x, 0, q4.z]);
    assert.equal(shut.status, 'accepted');
    assert.equal(line2().jobs[3]!.railStock, 8);
    assert.equal(line2().jobs[3]!.start, -1);
    const rails = railCounts(host.rules.railway.railway).rails!;
    assert.equal(rails.total, rails.poured);
    // A restart keeps the pack, the shelf and the rails on the back.
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(line2().pack, true);
    assert.equal(host.rules.railway.account('a')!.rails, LINE2_STATIONS[3]!.bill[1] - 8);
    assert.equal(line2().jobs[3]!.railStock, 8);
    assert.equal(line2().lever, false);
    assert.equal(railCounts(host.rules.railway.railway).rails!.total, rails.total);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('line host: the boiler and trains; a call judged on the halt; trains survive a restart', async () => {
  const { railwayAtTrains } = await import('../../test/helpers/railway-trains.ts');
  const { LINE2_BOILER, LINE2_OLD_TRAIN } = await import('../../src/sim/railway-line2-layout.ts');
  const { LINE_HALTS, trainAlong } = await import('../../src/sim/railway-train.ts');
  const { line2Rails } = await import('../../src/sim/railway-line2.ts');
  const { chopTo } = await import('../../test/helpers/railway-works.ts');
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
    host.rules.railway.world().load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
    host.rules.railway.touchAll();
    await open();
    // Station 6 takes nothing by hand before the fit (docs/plans/boiler-first-choice.md, step 3): a real load at its
    // frame is refused and stays on the back.
    const q6: [number, number, number] = [LINE2_STATIONS[5]!.x, 2400, LINE2_STATIONS[5]!.z];
    const carry = host.rules.railway.account('a')!.carry;
    assert.ok(carry >= 4);
    assert.equal((await action({ op: 'rail.deposit', station: 'Q6', n: carry, kind: 0 }, q6)).status, 'noop');
    assert.equal(host.rules.railway.railway.line2!.jobs[5]!.stock, 0);
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
    const { railLinePoint } = await import('../../src/sim/railway-line-path.ts');
    const p = railLinePoint(1, trainAlong(host.rules.railway.train(1)!, 1, host.sync.world.tick));
    assert.equal((await call(3, 1, [Math.round(p.x), 2200, Math.round(p.z)])).status, 'accepted', 'aboard');
    for (let t = 0; host.rules.railway.train(1)!.phase !== 1 && t < 200; t++) await ticks(1);
    assert.equal(host.rules.railway.train(1)!.phase, 1);
    const tick = host.sync.world.tick,
      rows = [host.rules.railway.train(0)!, host.rules.railway.train(1)!];
    const pose = rows.map((r, k) => trainAlong(r, k, tick));
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(host.sync.world.tick, tick);
    assert.deepEqual([host.rules.railway.train(0), host.rules.railway.train(1)], rows);
    assert.deepEqual(
      rows.map((_r, k) => trainAlong(host.rules.railway.train(k)!, k, host.sync.world.tick)),
      pose,
    );
    const l = host.rules.railway.railway.line2!;
    assert.equal(line2Rails(host.rules.railway.railway), l.forge.poured);
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
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
