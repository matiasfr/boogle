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
import { CART, CART_CALL, CART_PHASE, cartCycleTicks } from '../../src/sim/railway-cart.ts';
import { worldOf } from '../../test/railway-live.ts';
import { railwayAtQ4 } from '../../test/helpers/railway-q2.ts';

type Obj = Record<string, unknown>;
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
    while (line2().cart.phase !== CART_PHASE.DROP && waited < cartCycleTicks(3)) waited += (await ticks(10), 10);
    assert.equal(line2().cart.phase, CART_PHASE.DROP, 'the cart reached the rack');
    assert.equal(line2().cart.recall, false, 'the call was served at the forge on the way');
    assert.equal(line2().depotRails, CART.rails);
    const far = await edit('s1', { op: 'rail.depotRailTake' }, [LINE2_FORGE.x, 0, LINE2_FORGE.z]);
    assert.equal(far.status, 'rejected');
    const take = await edit('s1', { op: 'rail.depotRailTake' }, [q4.x, 0, q4.z]);
    assert.equal(take.accepted, CART.rails, 'a back of 16 takes them all');
    // The quarry gate is up: the frame takes nothing.
    const shut = await edit('s1', { op: 'rail.deposit', station: 'Q4', n: 8, kind: 2 }, [q4.x, 0, q4.z]);
    assert.equal(shut.status, 'noop');
    assert.equal(line2().jobs[3]!.railStock, 0);
    const rails = railCounts(host.rules.railway.railway).rails!;
    assert.equal(rails.total, rails.poured);
    // A restart keeps the pack, the shelf and the rails on the back.
    await host.close({ save: true });
    host = create();
    await host.whenReady();
    assert.equal(line2().pack, true);
    assert.equal(host.rules.railway.account('a')!.rails, CART.rails);
    assert.equal(railCounts(host.rules.railway.railway).rails!.total, rails.total);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});
