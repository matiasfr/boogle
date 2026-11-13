// A carrier who leaves (a hidden tab, a reload, a lost link) keeps the unique beam (owner, 6 November: you keep your
// load, or it goes down where you stood; you are never pulled back): back within `railBeamGraceS` they still carry
// it; away longer, it lies on the ground where they last stood.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { Beam } from '../../src/sim/railway-components.ts';
import { RAIL_POSITION_MAX } from '../../src/sim/railway-route.ts';

type Obj = Record<string, unknown>;

test('a carrier back after 4 s still carries the beam; after 5 min it lies where they stood', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-beam-absence-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  let people: (RailwayPosition | null)[] = [];
  const sent: Obj[] = [];
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('beam-absence'),
    store,
    tick: false,
    now: () => now,
    pidOf: () => 'alice',
    positions: () => people,
  });
  host.onSend((message) => sent.push(message));
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await host.sync.whenDurable();
      now += 100;
      if (people[0]) people[0].at = now;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const response = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(response);
    return Number(response.epoch);
  };
  try {
    await host.whenReady();
    const epoch = await open('a');
    // Alice holds the beam (the route to it is line-host's test) and walks off with it.
    // The state is the railway's world; a test sets it up through the store (marked, so it replicates).
    const w = host.rules.railway.world();
    const id = w.single(Beam);
    Object.assign(w.mut(Beam, id)!, { state: 'held', holder: 'alice', epoch, revision: w.get(Beam, id)!.revision + 1 });
    const beam = () => host.rules.railway.beam();
    people = [{ pid: 'alice', x: 980, y: 30.45, z: -130, at: now }];
    await ticks(12);
    assert.deepEqual([beam().x, beam().y, beam().z], [98000, 3000, -13000], 'it follows where she stands, at her feet');

    // A 4 s absence: her socket goes, a new one opens; she still carries it, in the new session.
    host.depart('a');
    people = [];
    await ticks(40);
    assert.equal(beam().state, 'held');
    const back = await open('a2');
    assert.equal(back, epoch + 1);
    assert.deepEqual(
      [beam().state, beam().holder, beam().epoch],
      ['held', 'alice', back],
      'back within the grace: carrying',
    );

    // A 5 minute absence: past the grace it goes down where she last stood, never back to the tree.
    host.depart('a2');
    now += 5 * 60000;
    await ticks(3);
    assert.deepEqual(
      [beam().state, beam().holder, beam().x, beam().y, beam().z],
      ['ground', '', 98000, 3000, -13000],
      'on the ground where she stood',
    );
    const later = await open('a3');
    assert.ok(later > back);
    assert.equal(beam().state, 'ground', 'coming back later finds it there');
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("the carrier's stood point is checked: never -0, never out of range, and the room still saves", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-beam-stood-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const host = createRailwayWorldHost({ roomId: railwayRoomId('beam-stood'), store, tick: false });
  try {
    await host.whenReady();
    const rail = host.rules.railway;
    const w = rail.world();
    const id = w.single(Beam);
    Object.assign(w.mut(Beam, id)!, { state: 'held', holder: 'alice', revision: w.get(Beam, id)!.revision + 1 });
    // Straight to the rule, past the host's cm(): what a modified holder's presence could carry.
    rail.beamStood('alice', 98000, 3000, -13000);
    for (const [x, y, z] of [
      [98000, 3000, -0],
      [-0, 3000, -13000],
      [98000, 1e300, -13000],
      [RAIL_POSITION_MAX + 1, 3000, -13000],
      [98000, 3000, 0.5],
      [NaN, 3000, -13000],
    ])
      rail.beamStood('alice', x!, y!, z!);
    const beam = () => rail.beam();
    assert.deepEqual([beam().x, beam().y, beam().z], [98000, 3000, -13000], 'none of them moved it');
    assert.doesNotThrow(() => rail.world().snapshot(), 'held');
    assert.equal(rail.beamPutDown('alice'), 1);
    assert.equal(beam().state, 'ground');
    assert.doesNotThrow(() => rail.world().snapshot(), 'put down');
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});
